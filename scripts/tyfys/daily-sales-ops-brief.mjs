#!/usr/bin/env node
/**
 * TYFYS Daily Sales + Ops Brief (WhatsApp-friendly text)
 *
 * Focus: Sales coverage (per-rep schedule) + calls/SMS activity + Zoho deal movement + meetings booked.
 *
 * Usage:
 *   node scripts/tyfys/daily-sales-ops-brief.mjs --hours 24 --connectedSec 30 --fewMin 2 [--redact]
 *   node scripts/tyfys/daily-sales-ops-brief.mjs --opsRisk [--opsHours 168 --opsLimit 40]
 *   node scripts/tyfys/daily-sales-ops-brief.mjs --selftest
 *
 * Flags:
 *   --redact     Mask phone numbers + deal/event titles so the output is safe to paste into group chats
 *   --opsRisk    Add an ops-focused “at-risk deal files” section (uses Zoho related records)
 *   --opsHours   Lookback window for ops risk scan (default 168h)
 *   --opsLimit   Max deals to scan for ops risk section (default 40)
 *   --selftest   Run a no-credentials sanity check for redaction helpers
 */

import { loadEnvLocal } from '../lib/load-env-local.mjs';
import { getZohoAccessToken, zohoCrmCoql, zohoCrmGet } from '../lib/zoho.mjs';
import { ringcentralGetJson } from '../lib/ringcentral.mjs';
import { scanDealFileHealth, formatHealthLine } from './lib/deal-file-health-lib.mjs';

loadEnvLocal();

function getArg(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return def;
  return v;
}

const hours = Number(getArg('--hours', '24'));
const connectedSec = Number(getArg('--connectedSec', '30'));
const fewMin = Number(getArg('--fewMin', '2'));
const fewMinSec = Math.round(fewMin * 60);

const redact = process.argv.includes('--redact');
const opsRisk = process.argv.includes('--opsRisk');
const opsHours = Number(getArg('--opsHours', '168'));
const opsLimit = Number(getArg('--opsLimit', '40'));
const opsMaxConcurrent = Number(getArg('--opsMaxConcurrent', '5'));

const selftest = process.argv.includes('--selftest');

if (selftest) {
  // Allows a quick sanity-check without any API credentials.
  // Run: node scripts/tyfys/daily-sales-ops-brief.mjs --selftest
  const { strict: assert } = await import('node:assert');

  // We can’t reassign `redact` (const), so just validate the helpers directly.
  assert.equal(maskPhone('+1 (321) 555-1234'), '***-***-1234');
  assert.equal(maskPhone('5551234'), '***-***-1234');

  // In redact mode, non-numeric names should not leak.
  // Simulate by temporarily calling the logic inline.
  const redactContactInline = (x) => {
    const phone = x?.phoneNumber;
    if (phone) return maskPhone(phone);
    const maybe = x?.name;
    const digits = maybe == null ? '' : String(maybe).replace(/\D/g, '');
    if (digits) return maskPhone(maybe);
    return 'Unknown';
  };

  assert.equal(redactContactInline({ name: 'John Smith' }), 'Unknown');
  assert.equal(redactContactInline({ name: '+1 555 777 8888' }), '***-***-8888');
  assert.equal(redactContactInline({ phoneNumber: '+1 555 777 8888', name: 'John' }), '***-***-8888');

  process.stdout.write('Selftest OK\n');
  process.exit(0);
}

const now = new Date();
const from = new Date(now.getTime() - hours * 60 * 60 * 1000);

// Sales roster (Zoho Owner.name matching)
const SALES_ROSTER = ['Adam', 'Amy', 'Jared', 'Ashley'];

function startOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

const todayStart = startOfLocalDay(now);
const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
const plus48h = new Date(todayStart.getTime() + 48 * 60 * 60 * 1000);

const ZOHO_API_DOMAIN = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

function iso(d) {
  // Zoho COQL datetime literals reject milliseconds.
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function fmtLocal(dt) {
  try {
    return new Date(dt).toLocaleString('en-US');
  } catch {
    return String(dt);
  }
}

function formatDuration(sec) {
  const s = Math.round(sec || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function maskPhone(v) {
  const raw = v == null ? '' : String(v);
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw || 'Unknown';
  if (digits.length < 4) return '***';
  const last4 = digits.slice(-4);
  return `***-***-${last4}`;
}

function redactContact(fromOrTo) {
  if (!redact) return fromOrTo?.phoneNumber || fromOrTo?.name || 'Unknown';

  const phone = fromOrTo?.phoneNumber;
  if (phone) return maskPhone(phone);

  // Some RC payloads put a number-ish string in name; we still mask it if so.
  const maybe = fromOrTo?.name;
  const digits = maybe == null ? '' : String(maybe).replace(/\D/g, '');
  if (digits) return maskPhone(maybe);

  return 'Unknown';
}

function redactTitle({ kind, id, title }) {
  if (!redact) return title || id || kind;
  const suffix = String(id || '').slice(-6) || '??????';
  return `${kind}#${suffix}`;
}

// RingCentral token refresh + rotation handled by scripts/lib/ringcentral.mjs

function summarizeCalls(records) {
  const out = {
    total: 0,
    inbound: 0,
    outbound: 0,
    missed: 0,
    connected: 0,
    fewMin: 0,
    totalDurationSec: 0,
  };

  for (const r of records || []) {
    out.total += 1;
    if (r.direction === 'Inbound') out.inbound += 1;
    if (r.direction === 'Outbound') out.outbound += 1;
    if (r.result === 'Missed') out.missed += 1;

    const dur = Number(r.duration) || 0;
    out.totalDurationSec += dur;

    if (dur >= connectedSec) out.connected += 1;
    if (dur >= fewMinSec) out.fewMin += 1;
  }

  return out;
}

function summarizeMessages(records) {
  const out = {
    total: 0,
    sms: 0,
    voicemail: 0,
    fax: 0,
  };
  for (const r of records || []) {
    out.total += 1;
    if (r.type === 'SMS') out.sms += 1;
    if (r.type === 'VoiceMail') out.voicemail += 1;
    if (r.type === 'Fax') out.fax += 1;
  }
  return out;
}

function topBy(arr, keyFn, limit = 5) {
  const m = new Map();
  for (const item of arr || []) {
    const k = keyFn(item);
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

async function zohoFetchDealMovement({ accessToken }) {
  // Deals modified in the last window (includes stage changes + any edits)
  // NOTE: field API names can vary; we’ll request common ones.
  const q = `select id, Deal_Name, Stage, Amount, Closing_Date, Owner, Modified_By, Modified_Time, Created_Time from Deals where Modified_Time >= '${iso(from)}' and Modified_Time <= '${iso(now)}' order by Modified_Time desc limit 200`;
  const res = await zohoCrmCoql({ accessToken, apiDomain: ZOHO_API_DOMAIN, selectQuery: q });
  const deals = res?.data || [];

  const createdToday = deals.filter(d => d.Created_Time && new Date(d.Created_Time) >= from);
  const closedWon = deals.filter(d => String(d.Stage || '').toLowerCase().includes('closed won'));
  const closedLost = deals.filter(d => String(d.Stage || '').toLowerCase().includes('closed lost'));

  return { deals, createdToday, closedWon, closedLost };
}

async function zohoFetchMeetingsBooked({ accessToken }) {
  // Events created during the window, and occurring in the future.
  // This approximates “meetings booked today” (created_time window), regardless of meeting date.
  const q = `select id, Event_Title, Start_DateTime, End_DateTime, Owner, Created_Time, Modified_By, What_Id from Events where Created_Time >= '${iso(from)}' and Created_Time <= '${iso(now)}' order by Created_Time desc limit 200`;
  const res = await zohoCrmCoql({ accessToken, apiDomain: ZOHO_API_DOMAIN, selectQuery: q });
  const events = (res?.data || []).filter(e => e.Start_DateTime && new Date(e.Start_DateTime) >= now);
  return { events };
}

async function zohoFetchSalesCoverageNext48h({ accessToken }) {
  // Pull upcoming Events + due Tasks over the next 48h, then filter locally by Owner.name.
  // COQL support for filtering on lookup subfields can vary by org, so we avoid Owner.name filters here.

  // Upcoming meetings/calls on calendar (Zoho Events)
  const qEvents = `select id, Event_Title, Start_DateTime, End_DateTime, Owner, What_Id from Events where Start_DateTime >= '${iso(todayStart)}' and Start_DateTime <= '${iso(plus48h)}' order by Start_DateTime asc limit 200`;

  // Tasks due (Zoho Tasks) — Due_Date is date-only in many orgs
  const qTasks = `select id, Subject, Due_Date, Status, Priority, Owner, What_Id from Tasks where Due_Date >= '${todayStart.toISOString().slice(0, 10)}' and Due_Date <= '${plus48h.toISOString().slice(0, 10)}' order by Due_Date asc limit 200`;

  const [eventsRes, tasksRes] = await Promise.all([
    zohoCrmCoql({ accessToken, apiDomain: ZOHO_API_DOMAIN, selectQuery: qEvents }),
    zohoCrmCoql({ accessToken, apiDomain: ZOHO_API_DOMAIN, selectQuery: qTasks }),
  ]);

  const events = (eventsRes?.data || []).filter(e => SALES_ROSTER.includes(e?.Owner?.name));
  const tasks = (tasksRes?.data || []).filter(t => SALES_ROSTER.includes(t?.Owner?.name));

  return { events, tasks };
}

function briefHeader() {
  return `Daily Sales + Ops Brief — ${now.toLocaleDateString('en-US')}`;
}

(async function main() {
  const lines = [];
  lines.push(briefHeader());
  lines.push(`Window: last ${hours}h | connected≥${connectedSec}s | long≥${fewMin}m${redact ? ' | REDACTED' : ''}`);

  // RingCentral activity
  const callLog = await ringcentralGetJson(`/restapi/v1.0/account/~/extension/~/call-log?dateFrom=${encodeURIComponent(iso(from))}&dateTo=${encodeURIComponent(iso(now))}&perPage=1000`);
  const msgs = await ringcentralGetJson(`/restapi/v1.0/account/~/extension/~/message-store?dateFrom=${encodeURIComponent(iso(from))}&dateTo=${encodeURIComponent(iso(now))}&perPage=1000`);

  const callSummary = summarizeCalls(callLog.records);
  const msgSummary = summarizeMessages(msgs.records);

  lines.push('');
  lines.push('SALES ACTIVITY (RingCentral)');
  lines.push(`Calls: ${callSummary.total} (in ${callSummary.inbound} / out ${callSummary.outbound} / missed ${callSummary.missed})`);
  lines.push(`Connected calls (≥${connectedSec}s): ${callSummary.connected}`);
  lines.push(`Long calls (≥${fewMin}m): ${callSummary.fewMin}`);
  lines.push(`Talk time: ${formatDuration(callSummary.totalDurationSec)}`);
  lines.push(`Messages: ${msgSummary.total} (SMS ${msgSummary.sms} / VM ${msgSummary.voicemail})`);

  const missedInbound = (callLog.records || [])
    .filter(r => r.direction === 'Inbound' && r.result === 'Missed')
    .slice(0, 10)
    .map(r => ({
      when: r.startTime,
      from: redactContact(r.from),
      to: redactContact(r.to),
    }));

  if (missedInbound.length) {
    lines.push('');
    lines.push('Missed inbound (latest):');
    for (const m of missedInbound) {
      lines.push(`- ${fmtLocal(m.when)}: ${m.from} → ${m.to}`);
    }
  }

  const inboundSms = (msgs.records || []).filter(r => r.type === 'SMS' && r.direction === 'Inbound');
  const topInboundSms = topBy(inboundSms, r => redactContact(r.from), 8);
  if (topInboundSms.length) {
    lines.push('');
    lines.push('Who texted you (inbound SMS top):');
    for (const [num, count] of topInboundSms) {
      lines.push(`- ${num}: ${count}`);
    }
  }

  // Zoho CRM
  const zohoToken = await getZohoAccessToken();

  // Sales coverage (next 48h) — this is the “what to expect from Sales” section.
  const coverage = await zohoFetchSalesCoverageNext48h({ accessToken: zohoToken });

  lines.push('');
  lines.push('SALES COVERAGE (Zoho Activities — next 48h)');
  for (const rep of SALES_ROSTER) {
    const repEvents = (coverage.events || []).filter(e => e?.Owner?.name === rep);
    const repTasks = (coverage.tasks || []).filter(t => t?.Owner?.name === rep);

    const todayEvents = repEvents.filter(e => e.Start_DateTime && new Date(e.Start_DateTime) >= todayStart && new Date(e.Start_DateTime) < tomorrowStart);
    const tomorrowEvents = repEvents.filter(e => e.Start_DateTime && new Date(e.Start_DateTime) >= tomorrowStart && new Date(e.Start_DateTime) < plus48h);

    const todayTasks = repTasks.filter(t => t.Due_Date === todayStart.toISOString().slice(0, 10));
    const tomorrowTasks = repTasks.filter(t => t.Due_Date === tomorrowStart.toISOString().slice(0, 10));

    lines.push('');
    lines.push(`${rep}:`);
    lines.push(`- Meetings today: ${todayEvents.length} | tomorrow: ${tomorrowEvents.length}`);
    lines.push(`- Tasks due today: ${todayTasks.length} | tomorrow: ${tomorrowTasks.length}`);

    const nextTwo = repEvents
      .filter(e => e.Start_DateTime && new Date(e.Start_DateTime) >= now)
      .slice(0, 2)
      .map(e => {
        const title = redactTitle({ kind: 'Event', id: e.id, title: e.Event_Title || 'Event' });
        return `  - ${fmtLocal(e.Start_DateTime)}: ${title}`;
      });
    if (nextTwo.length) {
      lines.push(`- Next up:`);
      lines.push(...nextTwo);
    }
  }

  const { deals, createdToday, closedWon, closedLost } = await zohoFetchDealMovement({ accessToken: zohoToken });
  const { events } = await zohoFetchMeetingsBooked({ accessToken: zohoToken });

  lines.push('');
  lines.push('PIPELINE MOVEMENT (Zoho CRM)');
  lines.push(`Deals updated: ${deals.length}`);
  lines.push(`Deals created: ${createdToday.length}`);
  lines.push(`Closed won: ${closedWon.length}`);
  lines.push(`Closed lost: ${closedLost.length}`);

  // Latest deal updates list (short)
  const latestDeals = deals.slice(0, 12).map(d => {
    const name = redactTitle({ kind: 'Deal', id: d.id, title: d.Deal_Name || d.id });
    const stage = d.Stage || '—';
    const owner = d.Owner?.name || '—';
    const by = d.Modified_By?.name || '—';
    const when = d.Modified_Time ? fmtLocal(d.Modified_Time) : '—';
    return `- ${when}: ${name} | ${stage} | owner ${owner} | by ${by}`;
  });

  if (latestDeals.length) {
    lines.push('');
    lines.push('Latest deal updates (top 12):');
    lines.push(...latestDeals);
  }

  lines.push('');
  lines.push('MEETINGS BOOKED (Zoho Events created in window)');
  lines.push(`New meetings booked: ${events.length}`);

  const nextMeetings = events
    .sort((a, b) => new Date(a.Start_DateTime) - new Date(b.Start_DateTime))
    .slice(0, 12)
    .map(e => {
      const when = e.Start_DateTime ? fmtLocal(e.Start_DateTime) : '—';
      const subj = redactTitle({ kind: 'Event', id: e.id, title: e.Event_Title || 'Meeting' });
      const owner = e.Owner?.name || '—';
      return `- ${when}: ${subj} (owner ${owner})`;
    });

  if (nextMeetings.length) {
    lines.push('');
    lines.push('Upcoming newly-booked meetings (top 12):');
    lines.push(...nextMeetings);
  }

  if (opsRisk) {
    lines.push('');
    lines.push(`OPS RISK FLAGS (Deal File Health — last ${opsHours}h)`);

    const { atRisk } = await scanDealFileHealth({
      zohoCrmCoql,
      zohoCrmGet,
      token: zohoToken,
      apiDomain: ZOHO_API_DOMAIN,
      hours: opsHours,
      limit: opsLimit,
      staleDays: 7,
      maxConcurrent: opsMaxConcurrent,
    });

    lines.push(`At-risk deals: ${atRisk.length} (scanned up to ${opsLimit})${redact ? ' | REDACTED' : ''}`);

    const top = atRisk.slice(0, 10);
    if (!top.length) {
      lines.push('- None flagged');
    } else {
      for (const r of top) lines.push(formatHealthLine({ r, redact }));
      if (atRisk.length > top.length) lines.push(`- (+${atRisk.length - top.length} more)`);
    }
  }

  process.stdout.write(lines.join('\n') + '\n');
})().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
