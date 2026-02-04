#!/usr/bin/env node
/**
 * Append provider-sourcing suggestions (from TYFYS public provider portal) into Deals.next_step
 * for pipeline stages: Intake (Document Collection), Ready for Provider, Sent to Provider.
 *
 * Primary inference: Attachment filenames (MDBQ/DBQ)
 * Backup inference: Notes + deal fields
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { loadEnvLocal } from '../lib/load-env-local.mjs';
import { getZohoAccessToken, zohoCrmCoql, zohoCrmGet, zohoCrmPut } from '../lib/zoho.mjs';
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

function hasFlag(name) {
  return process.argv.includes(name);
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function extractNeedTags({ text }) {
  const t = norm(text);
  const tags = [];

  // Keep all (including toxic), with emphasis on back/spine + neck.
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

  // Broad ortho/msk catch-all (lower priority than explicit back/neck)
  if (/ortho|orthopedic|msk|musculoskeletal|joint/.test(t)) tags.push('Orthopedic');

  return uniq(tags);
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

function scoreProviderForNeed(p, need) {
  const s = norm((p.specialty || []).join(' ') + ' ' + p.services + ' ' + p.notes);

  // Hard exclude: explicit off-limits competitors
  if (providerLooksCompetitor(p)) return -999;

  let score = 0;
  if (p.type === 'Local') score += 2;
  if (p.type === 'National') score += 1;

  const bump = (k, v = 3) => {
    if (s.includes(norm(k))) score += v;
  };

  switch (need) {
    case 'Back/Spine':
      bump('back/lumbar', 6); bump('spine', 6); bump('orthopedic', 3); bump('neurosurgery', 3); bump('neuroradiology', 2);
      break;
    case 'Neck':
      bump('neck', 6); bump('cervical', 6); bump('spine', 4); bump('orthopedic', 3);
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

  // prefer providers with direct email
  if (p.email) score += 2;

  return score;
}

function pickProvidersForNeed(providers, need, max = 5) {
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

async function listAllPages(pathAndQueryBase, accessToken) {
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

async function getDealNotes({ accessToken, dealId }) {
  try {
    return await listAllPages(`/crm/v2/Deals/${dealId}/Notes?sort_by=Modified_Time&sort_order=desc`, accessToken);
  } catch {
    return [];
  }
}

async function getDealAttachments({ accessToken, dealId }) {
  try {
    return await listAllPages(`/crm/v2/Deals/${dealId}/Attachments`, accessToken);
  } catch {
    return [];
  }
}

function buildAppendBlock({ dealName, needTags, providersByNeed }) {
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);

  const lines = [];
  lines.push('--- Provider Sourcing (auto) ---');
  lines.push(`Date: ${stamp}`);
  lines.push(`Inferred needs (priority order): ${needTags.length ? needTags.join(' | ') : '(unknown)'}`);

  // Keep the field readable: include detailed provider suggestions only for the top N needs.
  const MAX_NEEDS_WITH_SUGGESTIONS = 6;
  const needsForSuggestions = needTags.slice(0, MAX_NEEDS_WITH_SUGGESTIONS);
  const remainingNeeds = needTags.slice(MAX_NEEDS_WITH_SUGGESTIONS);

  for (const need of needsForSuggestions) {
    const list = (providersByNeed[need] || []).slice(0, 2);
    if (!list.length) continue;
    lines.push('');
    lines.push(`${need} (portal matches):`);
    for (const p of list) {
      lines.push(`- ${providerToOneLine(p)}`);
    }
  }

  if (remainingNeeds.length) {
    lines.push('');
    lines.push(`Other inferred needs (no inline suggestions to keep this short): ${remainingNeeds.join(' | ')}`);
  }

  lines.push('');
  lines.push('Off-limits (exclude): VetLink Solutions, REE Medical, Prestige Veteran Medical Consulting');

  return lines.join('\n');
}

function clampText(s, maxChars = 4500) {
  if (!s) return s;
  if (s.length <= maxChars) return s;
  return s.slice(0, maxChars - 40) + `\n... (truncated to ${maxChars} chars)`;
}

(async function main() {
  const days = Number(getArg('--days', '365'));
  const limit = Number(getArg('--limit', '200'));
  const dryRun = hasFlag('--dry-run');

  const accessToken = await getZohoAccessToken();

  const providers = await fetchTyfysPortalProviders();

  const STAGES = [
    'Intake (Document Collection)',
    'Ready for Provider',
    'Sent to Provider',
  ];
  const stageList = STAGES.map(s => `'${s.replace(/'/g, "\\'")}'`).join(',');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString().replace(/\.\d{3}Z$/, 'Z');

  // Pull deals in-scope. We'll fetch current next_step via GET per deal (COQL can be picky about field API names).
  const q = `select id, Deal_Name, Stage, Modified_Time from Deals where Stage in (${stageList}) and Modified_Time >= '${sinceIso}' order by Modified_Time desc limit ${limit}`;
  const dealsRes = await zohoCrmCoql({ accessToken, apiDomain: ZOHO_API_DOMAIN, selectQuery: q });
  const deals = dealsRes?.data || [];

  const report = {
    ranAt: new Date().toISOString(),
    days,
    limit,
    stages: STAGES,
    dryRun,
    dealsScanned: deals.length,
    dealsUpdated: 0,
    dealsSkippedNoNeeds: 0,
    dealsErrors: 0,
    samples: [],
  };

  for (const d of deals) {
    const dealId = d.id;
    const dealName = d.Deal_Name;

    try {
      const dealGet = await zohoCrmGet({
        accessToken,
        apiDomain: ZOHO_API_DOMAIN,
        pathAndQuery: `/crm/v2/Deals/${dealId}`,
      });
      const prev = dealGet?.data?.[0]?.next_step || dealGet?.data?.[0]?.Next_Step || '';

      const notes = await getDealNotes({ accessToken, dealId });
      const attachments = await getDealAttachments({ accessToken, dealId });

      const noteText = notes.map(n => `${n?.Note_Title || ''}\n${n?.Note_Content || ''}`).join('\n\n');
      const attachNames = attachments.map(a => a?.File_Name || a?.file_name || a?.name || '').filter(Boolean);

      const needTagsRaw = uniq([
        ...extractNeedTags({ text: attachNames.join(' ') }),
        ...extractNeedTags({ text: `${dealName}\n${noteText}` }),
      ]);

      const needTags = NEED_ORDER.filter(x => needTagsRaw.includes(x));

      if (!needTags.length) {
        report.dealsSkippedNoNeeds += 1;
        continue;
      }

      const providersByNeed = {};
      for (const need of needTags) {
        providersByNeed[need] = pickProvidersForNeed(providers, need, 5);
      }

      const appendBlock = buildAppendBlock({ dealName, needTags, providersByNeed });
      const newNext = clampText((prev ? `${String(prev).trim()}\n\n` : '') + appendBlock);

      if (!dryRun) {
        await zohoCrmPut({
          accessToken,
          apiDomain: ZOHO_API_DOMAIN,
          path: `/crm/v2/Deals`,
          json: {
            data: [{ id: dealId, next_step: newNext }],
            trigger: ['workflow'],
          },
        });
      }

      report.dealsUpdated += 1;
      if (report.samples.length < 5) {
        report.samples.push({ id: dealId, name: dealName, inferredNeeds: needTags, appendedChars: appendBlock.length });
      }
    } catch (e) {
      report.dealsErrors += 1;
      if (report.samples.length < 5) {
        report.samples.push({ id: dealId, name: dealName, error: String(e?.message || e) });
      }
    }
  }

  const outPath = getArg('--out', path.resolve(`memory/portal-provider-next-step-update-${new Date().toISOString().slice(0, 10)}.json`));
  await fs.writeFile(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(`DONE portal provider → next_step (${dryRun ? 'DRY RUN' : 'LIVE'}) deals_scanned=${report.dealsScanned} updated=${report.dealsUpdated} skipped_no_needs=${report.dealsSkippedNoNeeds} out=${outPath}`);
})().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
