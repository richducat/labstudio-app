#!/usr/bin/env node
/**
 * Pair pipeline clients (Deals) to potential providers.
 *
 * Inputs:
 * - Pipeline deals in stages Intake/Ready/Sent (pulled live from Zoho)
 * - Provider directory: TYFYS portal (public) filtered to target states
 *
 * Output:
 * - Markdown report listing each client with inferred needs + recommended providers
 *
 * Usage:
 *   node scripts/tyfys/pair-providers-to-clients.mjs --states FL,CA,CO,GA,TX --out memory/provider-client-pairs-YYYY-MM-DD.md
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { loadEnvLocal } from '../lib/load-env-local.mjs';
import { getZohoAccessToken, zohoCrmCoql, zohoCrmGet } from '../lib/zoho.mjs';
import { fetchTyfysPortalProviders, norm, providerLooksCompetitor, providerToOneLine } from './lib/tyfys-portal-providers.mjs';

loadEnvLocal();

const ZOHO_API_DOMAIN = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

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

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

const NEED_ORDER = [
  'Back/Spine',
  'Neck',
  'Toxic Exposure',
  'PTSD',
  'Mental Health',
  'Sleep Apnea',
  'TBI',
  'Headaches/Migraines',
  'Orthopedic',
  'Knee',
  'Shoulder',
  'Hip',
  'Ankle/Foot',
  'Wrist/Hand',
  'Elbow',
];

function parseNeedsFromNextStep(nextStep) {
  const t = String(nextStep || '');
  const line = t
    .split('\n')
    .find(l => l.toLowerCase().startsWith('inferred needs'));
  if (!line) return [];
  const m = line.split(':')[1];
  if (!m) return [];
  const parts = m.split('|').map(s => s.trim()).filter(Boolean);
  const ordered = NEED_ORDER.filter(x => parts.some(p => norm(p) === norm(x)));
  const extras = parts.filter(p => !ordered.some(x => norm(x) === norm(p)));
  return [...ordered, ...extras];
}

function extractNeedTagsFromText(text) {
  const t = norm(text);
  const tags = [];

  if (/back|spine|lumbar|thoracic/.test(t)) tags.push('Back/Spine');
  if (/neck|cervical/.test(t)) tags.push('Neck');
  if (/toxic|burn pit|burnpit|agent orange|pact act|pact/.test(t)) tags.push('Toxic Exposure');

  if (/\bptsd\b|post[- ]?traumatic/.test(t)) tags.push('PTSD');
  if (/(mental|depress|anxiety|panic|adhd|bipolar|schizo|ocd|mst)/.test(t)) tags.push('Mental Health');

  if (/sleep apnea|osa/.test(t)) tags.push('Sleep Apnea');
  if (/tbi|traumatic brain/.test(t)) tags.push('TBI');
  if (/migrain|headache/.test(t)) tags.push('Headaches/Migraines');

  if (/knee/.test(t)) tags.push('Knee');
  if (/shoulder/.test(t)) tags.push('Shoulder');
  if (/hip/.test(t)) tags.push('Hip');
  if (/ankle|foot/.test(t)) tags.push('Ankle/Foot');
  if (/wrist|hand/.test(t)) tags.push('Wrist/Hand');
  if (/elbow/.test(t)) tags.push('Elbow');

  if (/ortho|orthopedic|msk|musculoskeletal|joint/.test(t)) tags.push('Orthopedic');

  const ordered = NEED_ORDER.filter(x => tags.includes(x));
  return uniq(ordered);
}

function scoreProviderForNeed(p, need) {
  if (providerLooksCompetitor(p)) return -999;
  const s = norm((p.specialty || []).join(' ') + ' ' + p.services + ' ' + p.notes);
  let score = 0;

  // Prefer local, and prefer direct email, then phone
  if (p.type === 'Local') score += 2;
  if (p.email) score += 2;
  if (p.phone) score += 1;

  const bump = (k, v = 3) => { if (s.includes(norm(k))) score += v; };

  switch (need) {
    case 'Back/Spine':
      bump('back/lumbar', 7); bump('spine', 6); bump('orthopedic', 3); bump('neurosurgery', 3); bump('neuroradiology', 2);
      break;
    case 'Neck':
      bump('neck', 7); bump('cervical', 7); bump('spine', 4); bump('orthopedic', 3);
      break;
    case 'Toxic Exposure':
      bump('toxic exposure', 8); bump('occupational', 4); bump('environmental', 4); bump('epidemiology', 2);
      break;
    case 'PTSD':
      bump('ptsd', 8); bump('psychology', 4); bump('psychiatry', 4); bump('mental health', 3);
      break;
    case 'Mental Health':
      bump('mental health', 8); bump('psychology', 4); bump('psychiatry', 4); bump('neuropsychology', 2);
      break;
    case 'Sleep Apnea':
      bump('sleep apnea', 8); bump('sleep', 4);
      break;
    case 'TBI':
      bump('tbi', 8); bump('neuropsychology', 4); bump('neurology', 4);
      break;
    case 'Headaches/Migraines':
      bump('headaches/migraines', 8); bump('migraine', 6); bump('neurology', 4);
      break;
    case 'Orthopedic':
      bump('orthopedic', 8); bump('msk', 4); bump('extremities', 3);
      break;
    default:
      bump(need, 4);
  }

  return score;
}

function pickProviders(providers, need, max = 3) {
  const scored = providers
    .map(p => ({ p, score: scoreProviderForNeed(p, need) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const out = [];
  const seen = new Set();
  for (const { p } of scored) {
    const k = norm(p.name + '|' + p.state + '|' + p.county);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
    if (out.length >= max) break;
  }
  return out;
}

(async function main() {
  const states = parseStates(getArg('--states', 'FL,CA,CO,GA,TX'));
  const outPath = getArg('--out', path.resolve(`memory/provider-client-pairs-${new Date().toISOString().slice(0, 10)}.md`));

  const accessToken = await getZohoAccessToken();

  const STAGES = ['Intake (Document Collection)', 'Ready for Provider', 'Sent to Provider'];
  const stageList = STAGES.map(s => `'${s.replace(/'/g, "\\'")}'`).join(',');
  const q = `select id, Deal_Name, Stage, State, Zip_code, Modified_Time from Deals where Stage in (${stageList}) order by Modified_Time desc limit 200`;
  const res = await zohoCrmCoql({ accessToken, apiDomain: ZOHO_API_DOMAIN, selectQuery: q });
  const deals = res?.data || [];

  const stateSet = new Set(states.map(s => s.toUpperCase()));
  const targetDeals = deals.filter(d => stateSet.has(String(d.State || '').toUpperCase()));

  async function listAllPages(pathAndQueryBase) {
    const out = [];
    let page = 1;
    for (;;) {
      const sep = pathAndQueryBase.includes('?') ? '&' : '?';
      const pathAndQuery = `${pathAndQueryBase}${sep}page=${page}&per_page=200`;
      const res = await zohoCrmGet({ accessToken, apiDomain: ZOHO_API_DOMAIN, pathAndQuery });
      const data = res?.data || res?.notes || res?.attachments || [];
      if (Array.isArray(data) && data.length) out.push(...data);
      if (!Array.isArray(data) || data.length < 200) break;
      page += 1;
      if (page > 10) break;
    }
    return out;
  }

  // Enrich each target deal: needs from Next_Step OR from deal fields/attachments
  const enriched = [];
  for (const d of targetDeals) {
    const dealId = d.id;
    const g = await zohoCrmGet({ accessToken, apiDomain: ZOHO_API_DOMAIN, pathAndQuery: `/crm/v2/Deals/${dealId}` });
    const full = g?.data?.[0] || {};

    const nextStep = full.Next_Step || full.next_step || '';
    const needsFromNext = parseNeedsFromNextStep(nextStep);

    const attachments = await listAllPages(`/crm/v2/Deals/${dealId}/Attachments`);
    const attachNames = attachments.map(a => a?.File_Name || a?.file_name || a?.name || '').filter(Boolean);

    const textBlob = [
      full.Deal_Name,
      full.Conditions,
      full.Disabilities,
      full.Veteran_Current_Disabilities_stated,
      full.Description,
      attachNames.join(' '),
    ].filter(Boolean).join('\n');

    const needs = needsFromNext.length ? needsFromNext : extractNeedTagsFromText(textBlob);

    enriched.push({
      id: dealId,
      name: d.Deal_Name,
      stage: d.Stage,
      state: String(d.State || '').toUpperCase(),
      zip: d.Zip_code || null,
      needs,
    });
  }

  // Provider pool: portal providers filtered to target states (full names)
  const ABBR_TO_NAME = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
    FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky',
    LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
    MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
    ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
    TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
    DC: 'District of Columbia',
  };

  const wantedNames = new Set(states.map(s => ABBR_TO_NAME[s.toUpperCase()] || s).map(norm));
  const allProviders = await fetchTyfysPortalProviders();
  const providers = allProviders.filter(p => wantedNames.has(norm(p.state)) && !providerLooksCompetitor(p));

  const lines = [];
  lines.push(`# Provider ↔ Client pairing (portal-first)`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`States: ${states.join(', ')}`);
  lines.push(`Deals matched: ${enriched.length}`);
  lines.push(`Portal providers in these states: ${providers.length}`);
  lines.push('');

  for (const d of enriched.sort((a,b)=>a.state.localeCompare(b.state) || a.name.localeCompare(b.name))) {
    lines.push(`## ${d.name} — ${d.state} — ${d.stage}`);
    lines.push(`Deal ID: ${d.id}`);
    if (d.zip) lines.push(`ZIP: ${d.zip}`);
    lines.push(`Needs: ${d.needs.length ? d.needs.join(' | ') : '(no inferred needs found yet)'}`);

    if (!d.needs.length) {
      lines.push('');
      lines.push(`No suggested providers yet (needs missing).`);
      lines.push('');
      continue;
    }

    const topNeeds = d.needs.slice(0, 5);
    for (const need of topNeeds) {
      const picks = pickProviders(providers, need, 3);
      if (!picks.length) continue;
      lines.push('');
      lines.push(`**${need}**`);
      for (const p of picks) {
        lines.push(`- ${providerToOneLine(p)}`);
      }
    }

    lines.push('');
    lines.push('---');
    lines.push('');
  }

  await fs.writeFile(outPath, lines.join('\n'), 'utf8');
  console.log(`Wrote ${outPath}`);
})().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
