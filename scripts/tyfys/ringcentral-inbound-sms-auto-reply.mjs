#!/usr/bin/env node
/**
 * RingCentral inbound SMS auto-reply (first-touch)
 *
 * Purpose:
 *  - Cron-safe entrypoint that replies once per counterparty phone number.
 *  - Uses message-store inbound SMS; maintains local state file.
 *
 * Env:
 *  - RINGCENTRAL_* (see scripts/lib/ringcentral.mjs)
 *  - TYFYS_AUTO_REPLY_FROM_NUMBER (optional) number to reply from
 *  - TYFYS_AUTO_REPLY_TEXT (optional) reply body
 *
 * Usage:
 *  node scripts/tyfys/ringcentral-inbound-sms-auto-reply.mjs --lookbackMin 60 --dry-run
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { loadEnvLocal } from '../lib/load-env-local.mjs';
import { ringcentralGetJson, ringcentralSendSms } from '../lib/ringcentral.mjs';

loadEnvLocal();

const STATE_PATH = path.resolve('memory/tyfys-ringcentral-inbound-auto-reply.json');

const DEFAULT_REPLY = "Thanks for reaching out — got it. If booking a time is easier: zbooking.us/hh8dC\n\nReply STOP to opt out.";

function getArg(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return def;
  return v;
}

const dryRun = process.argv.includes('--dry-run');
const lookbackMin = Number(getArg('--lookbackMin', '60'));

function normalizePhone(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  if (s.startsWith('+')) return s;
  const digits = s.replace(/\D+/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return s;
}

function isStopLike(text) {
  const t = String(text || '').trim().toLowerCase();
  return ['stop', 'unsubscribe', 'do not contact', 'wrong number', 'wrong #'].some(k => t.includes(k));
}

async function readState() {
  try {
    return JSON.parse(await fs.readFile(STATE_PATH, 'utf8'));
  } catch {
    return { repliedTo: {}, lastRunAt: null };
  }
}

async function writeState(state) {
  await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

async function fetchInboundSmsSince(dateFrom) {
  const qs = new URLSearchParams({
    dateFrom: dateFrom.toISOString(),
    perPage: '200',
    messageType: 'SMS',
  });
  const store = await ringcentralGetJson(`/restapi/v1.0/account/~/extension/~/message-store?${qs.toString()}`);
  const recs = Array.isArray(store?.records) ? store.records : [];
  return recs.filter(r => String(r?.type || '').toUpperCase() === 'SMS' && String(r?.direction || '').toLowerCase() === 'inbound');
}

async function main() {
  const state = await readState();

  const fromDate = new Date(Date.now() - lookbackMin * 60 * 1000);
  const inbound = await fetchInboundSmsSince(fromDate);

  const replyText = String(process.env.TYFYS_AUTO_REPLY_TEXT || DEFAULT_REPLY).trim();
  const replyFrom = normalizePhone(process.env.TYFYS_AUTO_REPLY_FROM_NUMBER) || null;

  if (!replyFrom) {
    process.stdout.write('No TYFYS_AUTO_REPLY_FROM_NUMBER configured; exiting without sends.\n');
    return;
  }

  let replied = 0;

  for (const r of inbound) {
    const from = normalizePhone(r?.from?.phoneNumber || r?.from?.name);
    const toLine = normalizePhone(r?.to?.[0]?.phoneNumber || r?.to?.[0]?.name);

    if (!from) continue;
    if (state.repliedTo?.[from]) continue;

    const inboundBody = String(r?.subject || '').trim();
    if (isStopLike(inboundBody)) {
      state.repliedTo[from] = { skipped: 'stop_like', at: new Date().toISOString() };
      continue;
    }

    const text = replyText;

    if (dryRun) {
      process.stdout.write(`[dry-run] would auto-reply to ${from} (inbound to ${toLine || 'unknown'}): ${text}\n`);
    } else {
      await ringcentralSendSms({ fromNumber: replyFrom, toNumber: from, text });
    }

    state.repliedTo[from] = { at: new Date().toISOString(), toLine };
    replied += 1;
  }

  state.lastRunAt = new Date().toISOString();
  await writeState(state);

  process.stdout.write(`Done. replied=${replied} dryRun=${dryRun}\n`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
