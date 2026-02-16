#!/usr/bin/env node
/**
 * RingCentral inbound SMS -> forward to owner
 *
 * Purpose:
 *  - Cron-safe entrypoint that will not crash if token cache/env isn't set up.
 *  - For each NEW inbound SMS in a lookback window, forwards a short digest SMS
 *    to the Zoho record owner (mapped to a rep phone line).
 *
 * Env:
 *  - RINGCENTRAL_* (see scripts/lib/ringcentral.mjs)
 *  - ZOHO_* (see scripts/lib/zoho.mjs)
 *  - TYFYS_FORWARD_FROM_NUMBER (optional) number to send internal forwards from
 *  - TYFYS_FORWARD_DEFAULT_TO_NUMBER (optional) fallback internal number
 *
 * Usage:
 *  node scripts/tyfys/ringcentral-inbound-sms-forward-to-owner.mjs --lookbackMin 60 --dry-run
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { loadEnvLocal } from '../lib/load-env-local.mjs';
import { getZohoAccessToken, zohoCrmCoql } from '../lib/zoho.mjs';
import { ringcentralGetJson, ringcentralSendSms } from '../lib/ringcentral.mjs';

loadEnvLocal();

const STATE_PATH = path.resolve('memory/tyfys-ringcentral-inbound-forward.json');

const LINE_NUMBERS = {
  DEVIN: '+13212147853',
  ADAM: '+14072168511',
  AMY: '+13212349530',
  JARED: '+16822675268',
  KAREN: '+17724099069',
};

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

function ownerToLine(ownerName) {
  const n = String(ownerName || '').toLowerCase();
  if (n.includes('adam')) return LINE_NUMBERS.ADAM;
  if (n.includes('amy')) return LINE_NUMBERS.AMY;
  if (n.includes('jared')) return LINE_NUMBERS.JARED;
  if (n.includes('devin')) return LINE_NUMBERS.DEVIN;
  if (n.includes('karen')) return LINE_NUMBERS.KAREN;
  return null;
}

async function readState() {
  try {
    return JSON.parse(await fs.readFile(STATE_PATH, 'utf8'));
  } catch {
    return {
      forwardedMessageIds: {},
      lastRunAt: null,
    };
  }
}

async function writeState(state) {
  await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

async function zohoFindLeadOrContact({ accessToken, apiDomain, phone }) {
  const p = phone.replace(/'/g, "\\'");

  const qLead = `select id, Full_Name, First_Name, Last_Name, Email, Phone, Mobile, Owner, Lead_Status from Leads where (Phone = '${p}' or Mobile = '${p}') limit 1`;
  const leadRes = await zohoCrmCoql({ accessToken, apiDomain, selectQuery: qLead }).catch(() => null);
  const lead = leadRes?.data?.[0];
  if (lead) return { kind: 'lead', record: lead };

  const qContact = `select id, Full_Name, Email, Phone, Mobile, Owner from Contacts where (Phone = '${p}' or Mobile = '${p}') limit 1`;
  const contactRes = await zohoCrmCoql({ accessToken, apiDomain, selectQuery: qContact }).catch(() => null);
  const contact = contactRes?.data?.[0];
  if (contact) return { kind: 'contact', record: contact };

  return null;
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

function formatForward({ from, toLine, body, createdAt, ownerName, kind }) {
  const when = createdAt ? new Date(createdAt).toLocaleString('en-US') : 'unknown time';
  const who = ownerName ? `${ownerName}` : 'Unassigned';
  const tag = kind ? kind.toUpperCase() : 'UNKNOWN';
  const safeBody = String(body || '').trim().slice(0, 600);
  return `INBOUND SMS (${tag})\nFrom: ${from}\nTo line: ${toLine || 'unknown'}\nWhen: ${when}\nOwner: ${who}\n\n${safeBody}`;
}

async function main() {
  const state = await readState();

  const fromDate = new Date(Date.now() - lookbackMin * 60 * 1000);
  const inbound = await fetchInboundSmsSince(fromDate);

  const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
  const zohoToken = await getZohoAccessToken().catch(() => null);

  const forwardFrom = normalizePhone(process.env.TYFYS_FORWARD_FROM_NUMBER) || LINE_NUMBERS.AMY;
  const fallbackTo = normalizePhone(process.env.TYFYS_FORWARD_DEFAULT_TO_NUMBER) || null;

  let forwarded = 0;

  for (const r of inbound) {
    const msgId = String(r?.id || '');
    if (!msgId) continue;
    if (state.forwardedMessageIds?.[msgId]) continue;

    const from = normalizePhone(r?.from?.phoneNumber || r?.from?.name);
    const toLine = normalizePhone(r?.to?.[0]?.phoneNumber || r?.to?.[0]?.name);
    const body = r?.subject || '';

    let ownerName = null;
    let kind = null;

    if (zohoToken && from) {
      const match = await zohoFindLeadOrContact({ accessToken: zohoToken, apiDomain, phone: from });
      kind = match?.kind || null;
      ownerName = match?.record?.Owner?.name || null;
    }

    const forwardTo = ownerToLine(ownerName) || fallbackTo;
    if (!forwardTo) {
      // Nothing we can do; still mark processed so cron doesn't spam.
      state.forwardedMessageIds[msgId] = { skipped: true, at: new Date().toISOString() };
      continue;
    }

    const text = formatForward({ from, toLine, body, createdAt: r?.creationTime, ownerName, kind });

    if (dryRun) {
      process.stdout.write(`[dry-run] would forward msg ${msgId} to ${forwardTo} from ${forwardFrom}:\n${text}\n---\n`);
    } else {
      await ringcentralSendSms({ fromNumber: forwardFrom, toNumber: forwardTo, text });
    }

    state.forwardedMessageIds[msgId] = { forwardedTo: forwardTo, at: new Date().toISOString() };
    forwarded += 1;
  }

  state.lastRunAt = new Date().toISOString();
  await writeState(state);
  process.stdout.write(`Done. forwarded=${forwarded} dryRun=${dryRun}\n`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  // Cron reliability: exit non-zero only for real code errors.
  process.exit(1);
});
