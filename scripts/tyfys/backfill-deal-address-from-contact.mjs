#!/usr/bin/env node
/**
 * Backfill Deal address fields (Zip_code, State, Street, Apt, City_State) from the linked Contact.
 *
 * Why:
 * - Some deals have address populated on the Contact record (Mailing_*), while Deal fields are blank.
 * - We need Deal.State populated for states-first provider sourcing.
 *
 * Strategy:
 * - For pipeline stages (Intake/Ready/Sent), fetch Deal + Contact.
 * - If Deal.Zip_code missing and Contact.Mailing_Zip present → set Deal.Zip_code.
 * - If Deal.State missing:
 *     - If Contact.Mailing_State present → set Deal.State
 *     - else if we have a ZIP → map ZIP→state via zippopotam.us
 * - Optionally fill Deal.Street/Apt/City_State if missing and present on Contact.
 *
 * Usage:
 *   node scripts/tyfys/backfill-deal-address-from-contact.mjs --limit 200 --dry-run
 *   node scripts/tyfys/backfill-deal-address-from-contact.mjs --limit 200
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { loadEnvLocal } from '../lib/load-env-local.mjs';
import { getZohoAccessToken, zohoCrmCoql, zohoCrmGet, zohoCrmPut } from '../lib/zoho.mjs';

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

function blank(v) {
  return !String(v ?? '').trim();
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
  if (Object.prototype.hasOwnProperty.call(cache, z)) return cache[z];

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
  const limit = Number(getArg('--limit', '200'));
  const dryRun = hasFlag('--dry-run');

  const accessToken = await getZohoAccessToken();
  const cache = await readCache();

  const STAGES = ['Intake (Document Collection)', 'Ready for Provider', 'Sent to Provider'];
  const stageList = STAGES.map(s => `'${s.replace(/'/g, "\\'")}'`).join(',');

  const q = `select id, Deal_Name, Stage, Zip_code, State, Contact_Name, Modified_Time from Deals where Stage in (${stageList}) order by Modified_Time desc limit ${limit}`;
  const res = await zohoCrmCoql({ accessToken, apiDomain: ZOHO_API_DOMAIN, selectQuery: q });
  const deals = res?.data || [];

  let scanned = 0;
  let candidates = 0;
  let updated = 0;
  let skippedNoContact = 0;
  let skippedNoUsefulContactAddr = 0;

  const samples = [];

  for (const d of deals) {
    scanned++;

    const dealId = d.id;
    const contactId = d.Contact_Name?.id;
    if (!contactId) {
      skippedNoContact++;
      continue;
    }

    // Only act if Deal is missing State or Zip.
    if (!blank(d.State) && !blank(d.Zip_code)) continue;

    const cRes = await zohoCrmGet({ accessToken, apiDomain: ZOHO_API_DOMAIN, pathAndQuery: `/crm/v2/Contacts/${contactId}` });
    const c = cRes?.data?.[0] || {};

    const contactZip = cleanZip(c.Mailing_Zip || c.Other_Zip);
    const contactState = String(c.Mailing_State || c.Other_State || '').trim();
    const contactCity = String(c.Mailing_City || c.Other_City || '').trim();
    const contactStreet = String(c.Mailing_Street || c.Other_Street || '').trim();

    if (!contactZip && !contactState && !contactCity && !contactStreet) {
      skippedNoUsefulContactAddr++;
      continue;
    }

    candidates++;

    const patch = { id: dealId };

    // Zip
    if (blank(d.Zip_code) && contactZip) patch.Zip_code = contactZip;

    // State
    if (blank(d.State)) {
      if (contactState) patch.State = contactState;
      else {
        const st = await zipToState(contactZip || d.Zip_code, cache);
        if (st) patch.State = st;
      }
    }

    // Optional: City_State summary
    if (blank(d.City_State) && contactCity) {
      const st = patch.State || d.State || contactState;
      patch.City_State = st ? `${contactCity}, ${st}` : contactCity;
    }

    // Optional: Street
    if (blank(d.Street) && contactStreet) patch.Street = contactStreet;

    // Only update if we set something.
    const keys = Object.keys(patch).filter(k => k !== 'id');
    if (!keys.length) continue;

    if (!dryRun) {
      await zohoCrmPut({
        accessToken,
        apiDomain: ZOHO_API_DOMAIN,
        path: `/crm/v2/Deals`,
        json: { data: [patch], trigger: ['workflow'] },
      });
    }

    updated++;
    if (samples.length < 8) {
      samples.push({ deal: d.Deal_Name, stage: d.Stage, patch });
    }
  }

  await writeCache(cache);

  const out = {
    ranAt: new Date().toISOString(),
    dryRun,
    scanned,
    candidates,
    updated,
    skippedNoContact,
    skippedNoUsefulContactAddr,
    samples,
  };

  const outPath = path.resolve(`memory/backfill-deal-address-from-contact-${new Date().toISOString().slice(0, 10)}.json`);
  await fs.writeFile(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');

  console.log(`DONE deal address backfill (${dryRun ? 'DRY RUN' : 'LIVE'}) scanned=${scanned} candidates=${candidates} updated=${updated} out=${outPath}`);
})().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
