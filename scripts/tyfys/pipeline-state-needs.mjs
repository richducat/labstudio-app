#!/usr/bin/env node
/**
 * Pull pipeline deals (Intake/Ready/Sent) and summarize by State.
 *
 * Usage:
 *   node scripts/tyfys/pipeline-state-needs.mjs --days 365 --limit 300 --out memory/pipeline-state-needs-YYYY-MM-DD.json
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { loadEnvLocal } from '../lib/load-env-local.mjs';
import { getZohoAccessToken, zohoCrmCoql } from '../lib/zoho.mjs';

loadEnvLocal();

const ZOHO_API_DOMAIN = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

function getArg(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return def;
  return v;
}

(async function main() {
  const days = Number(getArg('--days', '365'));
  const limit = Number(getArg('--limit', '300'));
  const outPath = getArg('--out', path.resolve(`memory/pipeline-state-needs-${new Date().toISOString().slice(0, 10)}.json`));

  const accessToken = await getZohoAccessToken();

  const STAGES = ['Intake (Document Collection)', 'Ready for Provider', 'Sent to Provider'];
  const stageList = STAGES.map(s => `'${s.replace(/'/g, "\\'")}'`).join(',');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString().replace(/\.\d{3}Z$/, 'Z');

  const q = `select id, Deal_Name, Stage, State, Zip_code, Modified_Time from Deals where Stage in (${stageList}) and Modified_Time >= '${sinceIso}' order by Modified_Time desc limit ${limit}`;
  const res = await zohoCrmCoql({ accessToken, apiDomain: ZOHO_API_DOMAIN, selectQuery: q });
  const deals = res?.data || [];

  const byState = {};
  for (const d of deals) {
    const st = (d.State || '(missing)').trim?.() ? d.State : (d.State || '(missing)');
    byState[st] = byState[st] || [];
    byState[st].push({ id: d.id, name: d.Deal_Name, stage: d.Stage, zip: d.Zip_code || null, modifiedTime: d.Modified_Time });
  }

  const stateCounts = Object.entries(byState)
    .map(([state, arr]) => ({ state, count: arr.length }))
    .sort((a, b) => b.count - a.count || a.state.localeCompare(b.state));

  const out = {
    ranAt: new Date().toISOString(),
    days,
    limit,
    stages: STAGES,
    totalDeals: deals.length,
    stateCounts,
    byState,
  };

  await fs.writeFile(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${outPath}`);
  console.log(`Deals: ${deals.length} | States: ${stateCounts.length}`);
  console.log(stateCounts.slice(0, 15));
})().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
