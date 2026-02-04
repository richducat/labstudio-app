#!/usr/bin/env node
/**
 * Export TYFYS portal providers filtered by a set of state codes/names.
 *
 * Usage:
 *   node scripts/tyfys/export-portal-providers-by-state.mjs --states FL,GA,CO --out memory/portal-providers-by-state-YYYY-MM-DD.json
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { fetchTyfysPortalProviders, norm, providerLooksCompetitor } from './lib/tyfys-portal-providers.mjs';

function getArg(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return def;
  return v;
}

function parseStates(s) {
  return (s || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
}

(async function main() {
  const statesArg = getArg('--states', '');
  const states = parseStates(statesArg);
  if (!states.length) throw new Error('Pass --states like FL,GA,CO');

  const outPath = getArg('--out', path.resolve(`memory/portal-providers-by-state-${new Date().toISOString().slice(0, 10)}.json`));

  const providers = await fetchTyfysPortalProviders();

  const ABBR_TO_NAME = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
    FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky',
    LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
    MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
    ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
    TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
    DC: 'District of Columbia',
  };

  const want = new Set(
    states.flatMap(s => {
      const up = s.toUpperCase();
      const full = ABBR_TO_NAME[up];
      return full ? [norm(up), norm(full)] : [norm(s)];
    })
  );

  const matches = providers
    .filter(p => want.has(norm(p.state)))
    .map(p => ({
      id: p.id,
      name: p.name,
      state: p.state,
      county: p.county,
      type: p.type,
      specialty: p.specialty,
      services: p.services,
      contact: p.contact,
      phone: p.phone,
      email: p.email,
      notes: p.notes,
      offLimitsCompetitor: providerLooksCompetitor(p),
    }));

  await fs.writeFile(outPath, JSON.stringify({ states, count: matches.length, matches }, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${outPath} (matches=${matches.length})`);
})().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
