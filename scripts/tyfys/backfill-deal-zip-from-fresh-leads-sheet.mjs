#!/usr/bin/env node
/**
 * Backfill Zoho Deals.Zip_code (and optionally State) using the Google Sheet "New leads" → tab "Fresh Leads".
 *
 * Match priority:
 *  1) Email exact (case-insensitive)
 *  2) Phone exact (digits only)
 *  3) Name exact (lowercased) IF unique
 *
 * Scope:
 *  - Deals in stages: Intake (Document Collection), Ready for Provider, Sent to Provider
 *  - Only deals missing Zip_code (no 5-digit match)
 *
 * Usage:
 *  node scripts/tyfys/backfill-deal-zip-from-fresh-leads-sheet.mjs --dry-run
 *  node scripts/tyfys/backfill-deal-zip-from-fresh-leads-sheet.mjs --send
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { loadEnvLocal } from '../lib/load-env-local.mjs';
import { getZohoAccessToken, zohoCrmCoql, zohoCrmPut } from '../lib/zoho.mjs';

loadEnvLocal();

const ZOHO_API_DOMAIN = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
const SHEET_ID = '1wKYA5jwPdahm2RwY4-fWCgCSYW6PfKIBYGuTQ1nF7e0';
const SHEET_TAB = 'Fresh Leads';
const GOG_ACCOUNT = process.env.GOG_ACCOUNT || 'richard@thankyouforyourservice.co';

function hasFlag(name) {
  return process.argv.includes(name);
}

function digits(s) {
  return String(s || '').replace(/\D/g, '');
}

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function cleanZip(z) {
  const m = String(z || '').match(/\b\d{5}\b/);
  return m ? m[0] : null;
}

function runJson(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed: ${res.stderr || res.stdout}`);
  }
  try {
    return JSON.parse(res.stdout);
  } catch (e) {
    throw new Error(`Failed to parse JSON from ${cmd}: ${res.stdout.slice(0, 500)}`);
  }
}

async function zipToState(zip) {
  const z = cleanZip(zip);
  if (!z) return null;
  const url = `https://api.zippopotam.us/us/${z}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  return json?.places?.[0]?.['state abbreviation'] || null;
}

function buildIndex(rows) {
  // rows: [ [Date, Name, Rating, Email, Phone, Zip, ...], ...]
  const header = rows[0] || [];
  const idx = {
    name: header.findIndex(h => norm(h) === 'name'),
    email: header.findIndex(h => norm(h) === 'email'),
    phone: header.findIndex(h => norm(h) === 'phone'),
    zip: header.findIndex(h => norm(h) === 'zip'),
  };
  if (idx.name < 0 || idx.email < 0 || idx.phone < 0 || idx.zip < 0) {
    throw new Error(`Sheet header missing required columns. Found indexes: ${JSON.stringify(idx)} header=${JSON.stringify(header)}`);
  }

  const byEmail = new Map();
  const byPhone = new Map();
  const byName = new Map();
  const nameCounts = new Map();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const name = norm(r[idx.name]);
    const email = norm(r[idx.email]);
    const phone = digits(r[idx.phone]);
    const zip = cleanZip(r[idx.zip]);
    if (!zip) continue;

    const entry = { row: i + 1, name: r[idx.name] || '', email: r[idx.email] || '', phone: r[idx.phone] || '', zip };

    if (email) {
      if (!byEmail.has(email)) byEmail.set(email, entry);
    }
    if (phone) {
      if (!byPhone.has(phone)) byPhone.set(phone, entry);
    }
    if (name) {
      nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
      if (!byName.has(name)) byName.set(name, entry);
    }
  }

  return { byEmail, byPhone, byName, nameCounts };
}

(async function main() {
  const dryRun = !hasFlag('--send');

  const accessToken = await getZohoAccessToken();

  // Pull pipeline deals (last 200) and filter missing Zip_code client-side
  const STAGES = ['Intake (Document Collection)', 'Ready for Provider', 'Sent to Provider'];
  const stageList = STAGES.map(s => `'${s.replace(/'/g, "\\'")}'`).join(',');
  const q = `select id, Deal_Name, Stage, Email_Address, Phone_Number, Zip_code, State, Modified_Time from Deals where Stage in (${stageList}) order by Modified_Time desc limit 200`;
  const res = await zohoCrmCoql({ accessToken, apiDomain: ZOHO_API_DOMAIN, selectQuery: q });
  const deals = res?.data || [];
  const missingZipDeals = deals.filter(d => !cleanZip(d.Zip_code));

  // Fetch sheet (A:Z to ensure we capture header + zip column regardless of position)
  const sheet = runJson('gog', [
    'sheets', 'get', SHEET_ID,
    `'${SHEET_TAB}'!A:Z`,
    '--account', GOG_ACCOUNT,
    '--json',
  ]);

  const rows = sheet?.values || [];
  if (rows.length < 2) throw new Error('Sheet returned no rows');

  const index = buildIndex(rows);

  const updates = [];
  const unmatched = [];
  const ambiguous = [];

  for (const d of missingZipDeals) {
    const dealName = d.Deal_Name;
    const email = norm(d.Email_Address);
    const phone = digits(d.Phone_Number);
    const nameKey = norm(dealName);

    let match = null;
    let matchBy = null;

    if (email && index.byEmail.has(email)) {
      match = index.byEmail.get(email);
      matchBy = 'email';
    } else if (phone && index.byPhone.has(phone)) {
      match = index.byPhone.get(phone);
      matchBy = 'phone';
    } else if (nameKey && index.byName.has(nameKey)) {
      const count = index.nameCounts.get(nameKey) || 0;
      if (count === 1) {
        match = index.byName.get(nameKey);
        matchBy = 'name';
      } else {
        ambiguous.push({ id: d.id, name: dealName, reason: `name not unique (${count})` });
        continue;
      }
    }

    if (!match) {
      unmatched.push({ id: d.id, name: dealName, email: d.Email_Address || null, phone: d.Phone_Number || null });
      continue;
    }

    const zip = match.zip;
    const patch = { id: d.id, Zip_code: zip };

    if (!String(d.State || '').trim()) {
      const st = await zipToState(zip);
      if (st) patch.State = st;
    }

    updates.push({
      id: d.id,
      name: dealName,
      stage: d.Stage,
      matchBy,
      sheetRow: match.row,
      sheetEmail: match.email,
      sheetPhone: match.phone,
      zip,
      patch,
    });
  }

  const report = {
    ranAt: new Date().toISOString(),
    dryRun,
    sheet: { id: SHEET_ID, tab: SHEET_TAB, rows: rows.length },
    dealsScanned: deals.length,
    missingZipDeals: missingZipDeals.length,
    updates: updates.length,
    ambiguous: ambiguous.length,
    unmatched: unmatched.length,
    updatesPreview: updates.slice(0, 20),
    ambiguousPreview: ambiguous.slice(0, 20),
    unmatchedPreview: unmatched.slice(0, 20),
  };

  const outPath = path.resolve(`memory/backfill-deal-zip-from-sheet-${new Date().toISOString().slice(0, 10)}.json`);
  await fs.writeFile(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(`DRY_RUN=${dryRun} scanned=${deals.length} missingZip=${missingZipDeals.length} updates=${updates.length} ambiguous=${ambiguous.length} unmatched=${unmatched.length}`);
  console.log(`Report: ${outPath}`);

  if (dryRun) return;

  // Apply updates
  for (const u of updates) {
    await zohoCrmPut({
      accessToken,
      apiDomain: ZOHO_API_DOMAIN,
      path: `/crm/v2/Deals`,
      json: { data: [u.patch], trigger: ['workflow'] },
    });
  }

  console.log('DONE applying updates.');
})().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
