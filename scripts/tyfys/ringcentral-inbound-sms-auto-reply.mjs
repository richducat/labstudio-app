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
import { getZohoAccessToken, zohoCrmCoql } from '../lib/zoho.mjs';
import { ringcentralGetJson, ringcentralSendSms } from '../lib/ringcentral.mjs';

loadEnvLocal();

const STATE_PATH = path.resolve('memory/tyfys-ringcentral-inbound-auto-reply.json');

const DEFAULT_REPLY = "Thanks for reaching out — got it. If booking a time is easier: zbooking.us/hh8dC\n\nReply STOP to opt out.";

// Map Zoho owner -> RingCentral line number (send-from)
const LINE_NUMBERS = {
  DEVIN: '+13212147853',
  ADAM: '+14072168511',
  AMY: '+13212349530',
  JARED: '+16822675268',
  KAREN: '+17724099069',
};

function ownerToLine(ownerName) {
  const n = String(ownerName || '').toLowerCase();
  if (n.includes('adam')) return LINE_NUMBERS.ADAM;
  if (n.includes('amy')) return LINE_NUMBERS.AMY;
  if (n.includes('jared')) return LINE_NUMBERS.JARED;
  if (n.includes('devin')) return LINE_NUMBERS.DEVIN;
  if (n.includes('karen')) return LINE_NUMBERS.KAREN;
  return null;
}

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
    return { repliedTo: {}, failures: {}, lastRunAt: null };
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

async function zohoFindOwnerNameByPhone({ accessToken, apiDomain, phone }) {
  const p = phone.replace(/'/g, "\\'");

  const qLead = `select id, Full_Name, Owner from Leads where (Phone = '${p}' or Mobile = '${p}') limit 1`;
  const leadRes = await zohoCrmCoql({ accessToken, apiDomain, selectQuery: qLead }).catch(() => null);
  const lead = leadRes?.data?.[0];
  if (lead?.Owner?.name) return lead.Owner.name;

  const qContact = `select id, Full_Name, Owner from Contacts where (Phone = '${p}' or Mobile = '${p}') limit 1`;
  const contactRes = await zohoCrmCoql({ accessToken, apiDomain, selectQuery: qContact }).catch(() => null);
  const contact = contactRes?.data?.[0];
  if (contact?.Owner?.name) return contact.Owner.name;

  return null;
}

async function main() {
  const state = await readState();

  const fromDate = new Date(Date.now() - lookbackMin * 60 * 1000);
  const inbound = await fetchInboundSmsSince(fromDate);

  const replyText = String(process.env.TYFYS_AUTO_REPLY_TEXT || DEFAULT_REPLY).trim();

  const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
  const zohoToken = await getZohoAccessToken().catch(() => null);

  // Fallback if Zoho lookup fails: reply from the line the client texted.
  const envFallbackFrom = normalizePhone(process.env.TYFYS_AUTO_REPLY_FROM_NUMBER) || null;

  let replied = 0;
  let scanned = 0;
  const lineFailures = {};

  for (const r of inbound) {
    scanned += 1;

    const from = normalizePhone(r?.from?.phoneNumber || r?.from?.name);
    const toLine = normalizePhone(r?.to?.[0]?.phoneNumber || r?.to?.[0]?.name);

    if (!from) continue;

    // Determine which internal line to reply from: owner line > inbound line > env fallback.
    let ownerName = null;
    if (zohoToken) {
      ownerName = await zohoFindOwnerNameByPhone({ accessToken: zohoToken, apiDomain, phone: from });
    }
    const ownerLine = ownerToLine(ownerName);
    const replyFrom = ownerLine || toLine || envFallbackFrom;

    if (!replyFrom) {
      // Cron-safe: don't crash.
      state.failures[`${from}`] = { error: 'no_reply_from', at: new Date().toISOString(), ownerName, toLine };
      continue;
    }

    // Throttle: once per 24h per sender per line.
    const key = `${from}|${replyFrom}`;
    const prev = state.repliedTo?.[key];
    if (prev?.at) {
      const ageMs = Date.now() - new Date(prev.at).getTime();
      if (Number.isFinite(ageMs) && ageMs < 24 * 60 * 60 * 1000) continue;
    }

    const inboundBody = String(r?.subject || '').trim();
    if (isStopLike(inboundBody)) {
      state.repliedTo[key] = { skipped: 'stop_like', at: new Date().toISOString(), toLine, ownerName };
      continue;
    }

    const text = replyText;

    if (dryRun) {
      process.stdout.write(`[dry-run] would auto-reply to ${from} FROM ${replyFrom} (inbound to ${toLine || 'unknown'}, owner=${ownerName || 'unknown'}): ${text}\n`);
      state.repliedTo[key] = { at: new Date().toISOString(), toLine, ownerName, dryRun: true };
      replied += 1;
      continue;
    }

    try {
      await ringcentralSendSms({ fromNumber: replyFrom, toNumber: from, text });
      state.repliedTo[key] = { at: new Date().toISOString(), toLine, ownerName };
      replied += 1;
    } catch (err) {
      const msg = String(err?.message || err || '').slice(0, 500);
      lineFailures[replyFrom] = (lineFailures[replyFrom] || 0) + 1;
      state.failures[key] = { error: msg, at: new Date().toISOString(), toLine, ownerName };
    }
  }

  // Log summary line-failures compactly.
  const lf = Object.entries(lineFailures).map(([k, v]) => `${k}:${v}`).join(', ');
  if (lf) process.stdout.write(`line_failures=${lf}\n`);

  state.lastRunAt = new Date().toISOString();
  await writeState(state);

  process.stdout.write(`Done. dryRun=${dryRun} scanned=${scanned} replied=${replied}\n`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
