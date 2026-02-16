import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

async function withTempDir(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'clawd-rc-'));
  const prev = process.cwd();
  try {
    process.chdir(dir);
    await fn(dir);
  } finally {
    process.chdir(prev);
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function mockFetchOnce(handler) {
  const prev = globalThis.fetch;
  globalThis.fetch = handler;
  return () => {
    globalThis.fetch = prev;
  };
}

function freshImportFromHere(relToThisFile) {
  // Import using an absolute file:// URL so it still works after chdir().
  const url = new URL(relToThisFile, import.meta.url);
  url.searchParams.set('t', `${Date.now()}-${Math.random()}`); // bust ESM cache
  return import(url.href);
}

test('ringcentralGetAccessToken uses cached access token when unexpired', async () => {
  await withTempDir(async () => {
    await fs.mkdir('memory', { recursive: true });
    await fs.writeFile(
      'memory/ringcentral-token.json',
      JSON.stringify({ access_token: 'CACHED', expires_at_ms: Date.now() + 10 * 60_000, refresh_token: 'RT' }, null, 2)
    );

    process.env.RINGCENTRAL_CLIENT_ID = 'id';
    process.env.RINGCENTRAL_CLIENT_SECRET = 'secret';

    const restore = mockFetchOnce(() => {
      throw new Error('fetch should not be called when cache is valid');
    });

    const { ringcentralGetAccessToken } = await freshImportFromHere('../ringcentral.mjs');
    const tok = await ringcentralGetAccessToken();
    assert.equal(tok, 'CACHED');

    restore();
  });
});

test('ringcentralGetAccessToken refreshes when cache expired and writes rotated token', async () => {
  await withTempDir(async () => {
    await fs.mkdir('memory', { recursive: true });
    await fs.writeFile(
      'memory/ringcentral-token.json',
      JSON.stringify({ access_token: 'OLD', expires_at_ms: Date.now() - 1, refresh_token: 'OLD_RT' }, null, 2)
    );
    await fs.writeFile('.env.local', 'RINGCENTRAL_REFRESH_TOKEN=ENV_RT\n', 'utf8');

    process.env.RINGCENTRAL_API_SERVER = 'https://platform.ringcentral.com';
    process.env.RINGCENTRAL_CLIENT_ID = 'id';
    process.env.RINGCENTRAL_CLIENT_SECRET = 'secret';
    process.env.RINGCENTRAL_REFRESH_TOKEN = 'ENV_RT';

    const restore = mockFetchOnce(async (url, init) => {
      assert.ok(String(url).includes('/restapi/oauth/token'));
      assert.equal(init.method, 'POST');
      return {
        ok: true,
        status: 200,
        async json() {
          return { access_token: 'NEW_AT', refresh_token: 'NEW_RT', expires_in: 3600 };
        },
      };
    });

    const { ringcentralGetAccessToken } = await freshImportFromHere('../ringcentral.mjs');
    const tok = await ringcentralGetAccessToken();
    assert.equal(tok, 'NEW_AT');

    const updatedEnv = await fs.readFile('.env.local', 'utf8');
    assert.ok(updatedEnv.includes('RINGCENTRAL_REFRESH_TOKEN=NEW_RT'));

    const cache = JSON.parse(await fs.readFile('memory/ringcentral-token.json', 'utf8'));
    assert.equal(cache.access_token, 'NEW_AT');
    assert.equal(cache.refresh_token, 'NEW_RT');
    assert.ok(cache.expires_at_ms > Date.now());

    restore();
  });
});
