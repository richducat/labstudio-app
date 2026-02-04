#!/usr/bin/env node
/**
 * Backfill Deals.State from Deals.Zip_code when State is blank.
 *
 * Uses zippopotam.us (no auth) to map ZIP -> state abbreviation.
 * Writes a cache at memory/zip-state-cache.json.
 *
 * Usage:
 *   node scripts/tyfys/backfill-state-from-zip.mjs --days 365 --limit 200 --dry-run
 *   node scripts/tyfys/backfill-state-from-zip.mjs --days 365 --limit 200
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { loadEnvLocal } from '../lib/load-env-local.mjs';
import { getZohoAccessToken, zohoCrmCoql, zohoCrmPut } from '../lib/zoho.mjs';

loadEnvLocal();

const ZOHO_API_DOMAIN = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
const CACHE_PATH = path.resolve('memory/zip-state-cache.json');

function getArg(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return def;
  return v;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function cleanZip(z) {
  const m = String(z || '').match(/\d{5}/);
  return m ? m[0] : null;
}

async function readCache() {
  try {
    return JSON.parse(await fs.readFile(CACHE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

async function writeCache(obj) {
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await fs.writeFile(CACHE_PATH, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

async function zipToState(zip, cache) {
  const z = cleanZip(zip);
  if (!z) return null;
  if (cache[z]) return cache[z];

  const url = `https://api.zippopotam.us/us/${z}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    cache[z] = null;
    return null;
  }
  const json = await res.json().catch(() => null);
  const abbr = json?.places?.[0]?.['state abbreviation'] || null;
  cache[z] = abbr;
  return abbr;
}

(async function main() {
  const days = Number(getArg('--days', '365'));
  const limit = Number(getArg('--limit', '200'));
  const dryRun = hasFlag('--dry-run');

  const accessToken = await getZohoAccessToken();
  const cache = await readCache();

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString().replace(/\.\d{3}Z$/, 'Z');

  // Pull candidates with blank State.
  // NOTE: COQL null comparisons can be finicky; we fetch a broad set and filter client-side.
  const q = `select id, Deal_Name, Stage, State, Zip_code, Modified_Time from Deals where Modified_Time >= '${sinceIso}' order by Modified_Time desc limit ${limit}`;
  const res = await zohoCrmCoql({ accessToken, apiDomain: ZOHO_API_DOMAIN, selectQuery: q });
  const deals = res?.data || [];

  const candidates = deals.filter(d => !String(d.State || '').trim());

  let updated = 0;
  let skippedNoZip = 0;
  let skippedNoMap = 0;

  for (const d of candidates) {
    const zip = cleanZip(d.Zip_code);
    if (!zip) {
      skippedNoZip++;
      continue;
    }

    const st = await zipToState(zip, cache);
    if (!st) {
      skippedNoMap++;
      continue;
    }

    if (!dryRun) {
      await zohoCrmPut({
        accessToken,
        apiDomain: ZOHO_API_DOMAIN,
        path: `/crm/v2/Deals`,
        json: {
          data: [{ id: d.id, State: st }],
          trigger: ['workflow'],
        },
      });
    }

    updated++;
  }

  await writeCache(cache);

  console.log(
    `DONE state backfill (${dryRun ? 'DRY RUN' : 'LIVE'}) scanned=${deals.length} candidates_blank_state=${candidates.length} updated=${updated} skipped_no_zip=${skippedNoZip} skipped_no_map=${skippedNoMap}`
  );
})().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
