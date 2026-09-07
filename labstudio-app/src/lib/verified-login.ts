import { dbConfigured, ensureSchema, sql, findOrCreateUserByContact } from '@/lib/db';
import { getSessionSecret } from '@/lib/session';
import { loginMailConfig, sendLoginCode } from '@/lib/login-mail';
import { LOGIN_CODE_MAX_ATTEMPTS, LOGIN_CODE_TTL_SECONDS, loginDigest, makeLoginCode, normalizeLoginEmail, validLoginProof } from '@/lib/login-code';

async function loginStore() {
  if (!dbConfigured()) throw new Error('Secure sign-in is temporarily unavailable.');
  await ensureSchema();
  const q = sql();
  await q`create table if not exists lab_login_codes (
    id uuid primary key, email text not null, code_hash text not null,
    expires_at timestamptz not null, attempts integer not null default 0,
    used_at timestamptz, created_at timestamptz not null default now()
  )`;
  await q`create table if not exists lab_login_throttle (
    key text primary key, window_start timestamptz not null,
    last_sent timestamptz not null, count integer not null
  )`;
  return q;
}

export async function requestLoginCode(rawEmail: unknown) {
  const email = normalizeLoginEmail(rawEmail);
  const secret = getSessionSecret();
  const key = loginDigest(secret, 'recipient', email);
  loginMailConfig(); // Fail closed before creating challenges when delivery is unavailable.
  const q = await loginStore();
  // Atomic recipient throttle across workers: one request/minute, at most five/hour.
  const allowed = await q`insert into lab_login_throttle (key, window_start, last_sent, count)
    values (${key}, now(), now(), 1)
    on conflict (key) do update set
      window_start = case when lab_login_throttle.window_start < now() - interval '1 hour' then now() else lab_login_throttle.window_start end,
      count = case when lab_login_throttle.window_start < now() - interval '1 hour' then 1 else lab_login_throttle.count + 1 end,
      last_sent = now()
    where lab_login_throttle.last_sent < now() - interval '1 minute'
      and (lab_login_throttle.window_start < now() - interval '1 hour' or lab_login_throttle.count < 5)
    returning key`;
  if (!allowed.length) throw new Error('Please wait before requesting another sign-in code.');
  const { id, code } = makeLoginCode();
  const hash = loginDigest(secret, 'code', `${id}:${email}:${code}`);
  await q`delete from lab_login_codes where expires_at < now() - interval '1 day'`;
  await q`delete from lab_login_throttle where last_sent < now() - interval '1 day'`;
  // Supersede earlier codes for this email. Code values are never logged or returned.
  await q`update lab_login_codes set used_at = now() where email = ${email} and used_at is null`;
  await q`insert into lab_login_codes (id, email, code_hash, expires_at)
    values (${id}, ${email}, ${hash}, now() + (${LOGIN_CODE_TTL_SECONDS} * interval '1 second'))`;
  try { await sendLoginCode(email, code); }
  catch {
    await q`update lab_login_codes set used_at = now() where id = ${id}`;
    throw new Error('We could not send your sign-in code. Please try again later.');
  }
  return { challengeId: id, expiresIn: LOGIN_CODE_TTL_SECONDS };
}

export async function completeVerifiedLogin(rawEmail: unknown, id: unknown, code: unknown) {
  const email = normalizeLoginEmail(rawEmail);
  if (!validLoginProof(id, code)) throw new Error('Enter the six-digit code from your email.');
  const expected = loginDigest(getSessionSecret(), 'code', `${id}:${email}:${code}`);
  const q = await loginStore();
  // Check and consume in one UPDATE; simultaneous replay cannot both succeed.
  const result = await q`update lab_login_codes set attempts = attempts + 1,
    used_at = case when code_hash = ${expected} then now() else used_at end
    where id = ${id} and email = ${email} and used_at is null
      and expires_at > now() and attempts < ${LOGIN_CODE_MAX_ATTEMPTS}
    returning code_hash = ${expected} as verified`;
  if (result.length !== 1 || result[0].verified !== true) {
    throw new Error('That code is invalid or expired. Request a new code.');
  }
  // Only the proven email reaches identity resolution; never accept a UID cookie
  // or an unverified second contact as a way to choose/link another account.
  return findOrCreateUserByContact({ email });
}
