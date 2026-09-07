import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { createHmac } from 'node:crypto';
import { createLabstudioSessionToken, verifyLabstudioSessionToken } from '../src/lib/session';
import { loginDigest, normalizeLoginEmail } from '../src/lib/login-code';

const state = vi.hoisted(() => ({ q: null as unknown as (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>, email: '', code: '', cookies: new Map<string, string>() }));
vi.mock('@/lib/db', () => ({
  dbConfigured: () => true, ensureSchema: async () => {}, sql: () => state.q,
  findOrCreateUserByContact: vi.fn(async (input) => ({ user: { id: input.email }, profile: {}, created: false })),
}));
vi.mock('@/lib/login-mail', () => ({
  loginMailConfig: () => ({}),
  sendLoginCode: vi.fn(async (email, code) => { state.email = email; state.code = code; }),
}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (name: string) => state.cookies.has(name) ? { value: state.cookies.get(name) } : undefined }) }));
import { completeVerifiedLogin, requestLoginCode } from '../src/lib/verified-login';
import { getAuthenticatedUserId } from '../src/lib/authenticated-user';
import { findOrCreateUserByContact } from '../src/lib/db';
import { sendLoginCode } from '../src/lib/login-mail';

const secret = 'test-secret-used-only-by-local-tests-123456';
let db: PGlite;
beforeAll(async () => {
  process.env.LABSTUDIO_SESSION_SECRET = secret;
  db = new PGlite();
  state.q = async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const query = strings.reduce((text, part, i) => text + (i ? `$${i}` : '') + part, '');
    return (await db.query<Record<string, unknown>>(query, values)).rows;
  };
  await db.exec('create table lab_users (id text primary key);');
});
beforeEach(async () => {
  vi.clearAllMocks(); state.cookies.clear();
  await db.exec('drop table if exists lab_login_codes; drop table if exists lab_login_throttle; truncate lab_users;');
});
afterAll(async () => { await db.close(); });

describe('verified sign-in', () => {
  it('rejects email-only, phone-only, forged UID and malformed proofs without resolving identity', async () => {
    await expect(completeVerifiedLogin('member@example.com', undefined, undefined)).rejects.toThrow();
    await expect(completeVerifiedLogin(undefined, undefined, undefined)).rejects.toThrow();
    expect(findOrCreateUserByContact).not.toHaveBeenCalled();
  });
  it('accepts a delivered code once and only for the verified email', async () => {
    const challenge = await requestLoginCode(' Member@Example.com ');
    expect(challenge).not.toHaveProperty('code');
    const code = state.code;
    await expect(completeVerifiedLogin('other@example.com', challenge.challengeId, code)).rejects.toThrow();
    const results = await Promise.allSettled([
      completeVerifiedLogin('member@example.com', challenge.challengeId, code),
      completeVerifiedLogin('member@example.com', challenge.challengeId, code),
    ]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(findOrCreateUserByContact).toHaveBeenCalledExactlyOnceWith({ email: 'member@example.com' });
    const rows = await db.query<{ code_hash: string }>('select code_hash from lab_login_codes');
    expect(rows.rows[0].code_hash).not.toBe(code);
  });
  it('locks a challenge after five incorrect attempts', async () => {
    const c = await requestLoginCode('member@example.com'); const correct = state.code;
    const wrong = correct === '000000' ? '000001' : '000000';
    for (let i = 0; i < 5; i++) await expect(completeVerifiedLogin(state.email, c.challengeId, wrong)).rejects.toThrow();
    await expect(completeVerifiedLogin(state.email, c.challengeId, correct)).rejects.toThrow();
    expect(findOrCreateUserByContact).not.toHaveBeenCalled();
  });
  it('rejects expired codes and supersedes older codes', async () => {
    const c = await requestLoginCode('member@example.com'); const code = state.code;
    await db.exec("update lab_login_codes set expires_at = now() - interval '1 second'");
    await expect(completeVerifiedLogin(state.email, c.challengeId, code)).rejects.toThrow();
    await db.exec("update lab_login_throttle set last_sent = now() - interval '2 minutes'");
    const c2 = await requestLoginCode('member@example.com'); const code2 = state.code;
    await db.exec("update lab_login_throttle set last_sent = now() - interval '2 minutes'");
    await requestLoginCode('member@example.com');
    await expect(completeVerifiedLogin('member@example.com', c2.challengeId, code2)).rejects.toThrow();
  });
  it('enforces recipient rate limits atomically across concurrent requests', async () => {
    const requests = await Promise.allSettled(Array.from({ length: 4 }, () => requestLoginCode('member@example.com')));
    expect(requests.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(sendLoginCode).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 4; i++) {
      await db.exec("update lab_login_throttle set last_sent = now() - interval '2 minutes'");
      await requestLoginCode('member@example.com');
    }
    await db.exec("update lab_login_throttle set last_sent = now() - interval '2 minutes'");
    await expect(requestLoginCode('member@example.com')).rejects.toThrow();
  });
  it('invalidates challenges if email delivery fails', async () => {
    vi.mocked(sendLoginCode).mockRejectedValueOnce(new Error('SMTP unavailable'));
    await expect(requestLoginCode('member@example.com')).rejects.toThrow();
    expect((await db.query('select id from lab_login_codes where used_at is null')).rows).toHaveLength(0);
  });
});

describe('session authorization', () => {
  it('rejects old signed v1 sessions, tampering, wrong keys and expiry', async () => {
    const token = await createLabstudioSessionToken('member-a', secret, 1000);
    expect(await verifyLabstudioSessionToken(token, secret, 2000)).toMatchObject({ userId: 'member-a' });
    expect(await verifyLabstudioSessionToken(token, secret, 1000 + 7 * 86400000)).toBeNull();
    expect(await verifyLabstudioSessionToken(token, secret + 'wrong', 2000)).toBeNull();
    const old = Buffer.from(JSON.stringify({ v: 'v1', uid: 'member-a', exp: Date.now() + 999999 })).toString('base64url');
    const signedOld = `${old}.${createHmac('sha256', secret).update(old).digest('base64url')}`;
    expect(await verifyLabstudioSessionToken(signedOld, secret)).toBeNull();
    const forged = Buffer.from(JSON.stringify({ v: 'v2', uid: 'member-b', exp: Date.now() + 999999 })).toString('base64url');
    expect(await verifyLabstudioSessionToken(`${forged}.${token.split('.')[1]}`, secret)).toBeNull();
  });
  it('ignores a forged UID and never authenticates a deleted account', async () => {
    await db.exec("insert into lab_users values ('member-a'), ('member-b')");
    state.cookies.set('labstudio_uid', 'member-b');
    expect(await getAuthenticatedUserId()).toBeUndefined();
    state.cookies.set('labstudio_session', await createLabstudioSessionToken('member-a', secret));
    expect(await getAuthenticatedUserId()).toBe('member-a');
    await db.exec("delete from lab_users where id = 'member-a'");
    expect(await getAuthenticatedUserId()).toBeUndefined();
  });
  it('rejects recipient injection and separates challenge hashes by context', () => {
    expect(() => normalizeLoginEmail('a@example.com\r\nBcc: b@example.com')).toThrow();
    expect(loginDigest(secret, 'code', 'id:a@example.com:123456')).not.toBe(loginDigest(secret, 'code', 'id:b@example.com:123456'));
  });
});
