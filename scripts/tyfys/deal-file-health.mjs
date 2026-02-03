#!/usr/bin/env node
/**
 * TYFYS Deal File Health Scanner
 *
 * Scans Deals in key stages and summarizes "what's on file":
 * - open tasks (deal-linked)
 * - notes
 * - attachments
 *
 * Adds a lightweight "at-risk" classifier so you can quickly spot deals that
 * are likely stuck (overdue tasks, no attachments, stale notes/attachments).
 *
 * Usage:
 *   node scripts/tyfys/deal-file-health.mjs --hours 168
 *   node scripts/tyfys/deal-file-health.mjs --hours 168 --limit 100 --out zoho_exports/deal-file-health.txt
 *   node scripts/tyfys/deal-file-health.mjs --hours 168 --staleDays 7 --onlyAtRisk
 *   node scripts/tyfys/deal-file-health.mjs --selftest
 *
 * Flags:
 *   --redact       Mask deal/provider names so output is safe to paste into non-private channels
 *   --staleDays    Consider notes/attachments older than N days as "stale" (default 7)
 *   --onlyAtRisk   Only print deals with one or more risk flags
 *   --selftest     Run a no-credentials sanity check for helpers
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { loadEnvLocal } from '../lib/load-env-local.mjs';
import { getZohoAccessToken, zohoCrmCoql, zohoCrmGet } from '../lib/zoho.mjs';

loadEnvLocal();
process.stdout.on('error', () => {});

function getArg(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return def;
  return v;
}

const hours = Number(getArg('--hours', '168'));
const limit = Number(getArg('--limit', '120'));
const outPath = getArg('--out', null);

const staleDays = Number(getArg('--staleDays', '7'));
const redact = process.argv.includes('--redact');
const onlyAtRisk = process.argv.includes('--onlyAtRisk');
const selftest = process.argv.includes('--selftest');

function isoZoho(d) {
  return d.toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

function safeDateMs(v) {
  if (!v) return null;
  const ms = new Date(v).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function daysSince(ms) {
  if (!ms) return null;
  return (Date.now() - ms) / (24 * 3600 * 1000);
}

function redactDealName({ dealId, dealName }) {
  if (!redact) return dealName || dealId;
  const suffix = String(dealId || '').slice(-6) || '??????';
  return `Deal#${suffix}`;
}

function redactProvider(v) {
  if (!redact) {
    if (Array.isArray(v)) return v.join(', ');
    return v || '';
  }
  return Array.isArray(v) && v.length ? 'REDACTED' : (v ? 'REDACTED' : '');
}

async function fetchAllRelated({ token, apiDomain, dealId, rel, perPage = 200, maxPages = 10 }) {
  let page = 1;
  let out = [];
  for (;;) {
    const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    const j = await zohoCrmGet({ accessToken: token, apiDomain, pathAndQuery: `/crm/v2/Deals/${dealId}/${rel}?${qs.toString()}` });
    const data = j.data || [];
    out = out.concat(data);
    if (!j.info?.more_records) break;
    page += 1;
    if (page > maxPages) break;
  }
  return out;
}

function healthSummary({ tasks, notes, attachments }) {
  const openTasks = (tasks || []).filter(t => !['Completed', 'Closed'].includes(String(t.Status || '')));
  const overdue = openTasks.filter(t => t.Due_Date && new Date(t.Due_Date).getTime() < Date.now());

  const lastNote = (notes || [])
    .map(n => n.Modified_Time || n.Created_Time)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || '';

  const lastAttach = (attachments || [])
    .map(a => a.Modified_Time || a.Created_Time)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || '';

  return {
    openTasksCount: openTasks.length,
    overdueTasksCount: overdue.length,
    notesCount: (notes || []).length,
    attachmentsCount: (attachments || []).length,
    lastNote,
    lastAttach,
  };
}

function riskFlags({ dealStage, h, staleDays }) {
  const flags = [];

  if (h.overdueTasksCount > 0) flags.push('OVERDUE_TASKS');
  if (h.openTasksCount >= 6) flags.push('MANY_OPEN_TASKS');

  // In these stages, attachments are often required for provider handoff.
  const stage = String(dealStage || '');
  const stageNeedsFiles = ['Ready for Provider', 'Sent to Provider'].some(s => stage.includes(s));
  if (stageNeedsFiles && h.attachmentsCount === 0) flags.push('NO_ATTACHMENTS');

  const noteAge = daysSince(safeDateMs(h.lastNote));
  if (noteAge != null && noteAge >= staleDays) flags.push(`STALE_NOTE_${staleDays}D`);

  const attachAge = daysSince(safeDateMs(h.lastAttach));
  if (attachAge != null && attachAge >= staleDays) flags.push(`STALE_ATTACH_${staleDays}D`);

  return flags;
}

if (selftest) {
  const { strict: assert } = await import('node:assert');

  // Health summary basics
  const h = healthSummary({
    tasks: [{ Status: 'Open', Due_Date: '2000-01-01' }, { Status: 'Completed', Due_Date: '2000-01-01' }],
    notes: [{ Created_Time: '2020-01-01T00:00:00+00:00' }],
    attachments: [],
  });
  assert.equal(h.openTasksCount, 1);
  assert.equal(h.overdueTasksCount, 1);
  assert.equal(h.notesCount, 1);
  assert.equal(h.attachmentsCount, 0);

  // Risk flags basics
  const flags = riskFlags({ dealStage: 'Ready for Provider', h, staleDays: 7 });
  assert.ok(flags.includes('OVERDUE_TASKS'));
  assert.ok(flags.includes('NO_ATTACHMENTS'));

  process.stdout.write('Selftest OK\n');
  process.exit(0);
}

async function main() {
  const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
  const token = await getZohoAccessToken();

  const sinceIso = isoZoho(new Date(Date.now() - hours * 3600 * 1000));
  const q = `select id, Deal_Name, Stage, Modified_Time, Last_Activity_Time, Appointment_Status, Provider from Deals where Modified_Time >= '${sinceIso}' and Stage in ('Intake (Document Collection)','Ready for Provider','Sent to Provider') limit ${Math.min(limit, 200)}`;
  const res = await zohoCrmCoql({ accessToken: token, apiDomain, selectQuery: q });
  const deals = res?.data || [];

  const rows = [];
  for (const d of deals) {
    const dealId = String(d.id);
    const [tasks, notes, attachments] = await Promise.all([
      fetchAllRelated({ token, apiDomain, dealId, rel: 'Tasks' }),
      fetchAllRelated({ token, apiDomain, dealId, rel: 'Notes' }),
      fetchAllRelated({ token, apiDomain, dealId, rel: 'Attachments' }),
    ]);

    const h = healthSummary({ tasks, notes, attachments });
    const flags = riskFlags({ dealStage: d.Stage, h, staleDays });

    rows.push({
      dealId,
      dealName: d.Deal_Name,
      stage: d.Stage,
      provider: d.Provider,
      apptStatus: d.Appointment_Status,
      h,
      flags,
      modifiedTime: d.Modified_Time,
    });
  }

  // Prioritize highest-signal issues first.
  const flagRank = new Map([
    ['OVERDUE_TASKS', 100],
    ['NO_ATTACHMENTS', 80],
    ['MANY_OPEN_TASKS', 60],
  ]);

  const score = (r) => {
    let s = 0;
    for (const f of r.flags) {
      if (flagRank.has(f)) s += flagRank.get(f);
      else if (String(f).startsWith('STALE_NOTE_')) s += 30;
      else if (String(f).startsWith('STALE_ATTACH_')) s += 25;
      else s += 10;
    }
    return s;
  };

  rows.sort((a, b) => {
    const ds = score(b) - score(a);
    if (ds !== 0) return ds;
    const ta = safeDateMs(a.modifiedTime) || 0;
    const tb = safeDateMs(b.modifiedTime) || 0;
    return tb - ta;
  });

  const lines = [];
  lines.push(`Deal File Health — window last ${hours}h`);
  lines.push(`Deals scanned: ${rows.length}${onlyAtRisk ? ' | ONLY_AT_RISK' : ''}${redact ? ' | REDACTED' : ''}`);
  lines.push(`Stale threshold: ${staleDays}d`);

  const atRisk = rows.filter(r => r.flags.length);
  lines.push(`At-risk deals: ${atRisk.length}`);
  lines.push('');

  const toPrint = onlyAtRisk ? atRisk : rows;
  for (const r of toPrint) {
    const name = redactDealName({ dealId: r.dealId, dealName: r.dealName });
    const provider = redactProvider(r.provider);
    const flagsStr = r.flags.length ? r.flags.join(',') : 'OK';

    lines.push(
      `- ${name} | ${r.stage} | Provider=${provider} | Appt=${r.apptStatus || ''} | open_tasks=${r.h.openTasksCount} (overdue=${r.h.overdueTasksCount}) | notes=${r.h.notesCount} last_note=${r.h.lastNote || 'n/a'} | attachments=${r.h.attachmentsCount} last_attach=${r.h.lastAttach || 'n/a'} | flags=${flagsStr}`
    );
  }

  const out = lines.join('\n') + '\n';
  if (outPath) {
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, out, 'utf8');
  }
  process.stdout.write(out);
}

await main();
