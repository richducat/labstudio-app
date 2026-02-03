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
import { formatHealthLine, scanDealFileHealth, selftestDealFileHealthLib } from './lib/deal-file-health-lib.mjs';

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

const maxConcurrent = Number(getArg('--maxConcurrent', '5'));

function safeDateMs(v) {
  if (!v) return null;
  const ms = new Date(v).getTime();
  return Number.isFinite(ms) ? ms : null;
}

if (selftest) {
  await selftestDealFileHealthLib();
  process.exit(0);
}

async function main() {
  const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
  const token = await getZohoAccessToken();

  const { rows, atRisk } = await scanDealFileHealth({
    zohoCrmCoql,
    zohoCrmGet,
    token,
    apiDomain,
    hours,
    limit,
    staleDays,
    maxConcurrent,
  });

  const lines = [];
  lines.push(`Deal File Health — window last ${hours}h`);
  lines.push(`Deals scanned: ${rows.length}${onlyAtRisk ? ' | ONLY_AT_RISK' : ''}${redact ? ' | REDACTED' : ''}`);
  lines.push(`Stale threshold: ${staleDays}d | maxConcurrent=${maxConcurrent}`);
  lines.push(`At-risk deals: ${atRisk.length}`);
  lines.push('');

  const toPrint = onlyAtRisk ? atRisk : rows;
  for (const r of toPrint) {
    lines.push(formatHealthLine({ r, redact }));
  }

  const out = lines.join('\n') + '\n';
  if (outPath) {
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, out, 'utf8');
  }
  process.stdout.write(out);
}

await main();
