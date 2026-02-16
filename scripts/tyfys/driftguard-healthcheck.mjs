#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadEnvLocal } from '../lib/load-env-local.mjs';
import { ringcentralGetAccessToken } from '../lib/ringcentral.mjs';
import { getZohoAccessToken, zohoCrmGet } from '../lib/zoho.mjs';

loadEnvLocal();

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

async function checkRingCentral() {
  const token = await ringcentralGetAccessToken();
  if (!token || typeof token !== 'string') throw new Error('RingCentral access token missing/invalid');
  return { ok: true };
}

async function checkZoho() {
  const token = await getZohoAccessToken();
  const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
  // Lightweight authenticated call to ensure token works.
  await zohoCrmGet({ accessToken: token, apiDomain, pathAndQuery: '/crm/v2/users?type=CurrentUser' });
  return { ok: true };
}

function checkExpectedScripts() {
  const expected = [
    'scripts/tyfys/sms-autopilot.mjs',
    'scripts/tyfys/fulfillment-tasker.mjs',
    'scripts/tyfys/provider-handoff-tasker.mjs',
    // The following are referenced by existing cron jobs in ~/.openclaw/cron/jobs.json on this machine.
    // If you rename/move them, update the cron job definitions too.
    'scripts/tyfys/morning-sales-team-ringcentral-update.mjs',
    'scripts/tyfys/ringcentral-inbound-sms-forward-to-owner.mjs',
    'scripts/tyfys/ringcentral-inbound-sms-auto-reply.mjs',
  ];

  const missing = expected.filter((p) => !exists(path.resolve(p)));
  return { ok: missing.length === 0, missing };
}

async function main() {
  const startedAt = new Date().toISOString();
  const report = {
    startedAt,
    ringcentral: { ok: false },
    zoho: { ok: false },
    scripts: { ok: false, missing: [] },
  };

  try {
    report.ringcentral = await checkRingCentral();
  } catch (e) {
    report.ringcentral = { ok: false, error: String(e?.message || e) };
  }

  try {
    report.zoho = await checkZoho();
  } catch (e) {
    report.zoho = { ok: false, error: String(e?.message || e) };
  }

  report.scripts = checkExpectedScripts();

  const ok = report.ringcentral.ok && report.zoho.ok && report.scripts.ok;
  report.ok = ok;

  console.log(JSON.stringify(report, null, 2));
  process.exit(ok ? 0 : 2);
}

await main();
