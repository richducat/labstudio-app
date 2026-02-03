#!/usr/bin/env node
/**
 * Quick triage for provider transitions:
 * - Sent to Suntree for PTSD/Mental Health
 * - Needs to be sent to Suntree for PTSD/Mental Health
 * - Was supposed to be sent to Alina or Neurahealth (categorize by condition)
 *
 * Heuristics:
 * - Use Zoho Deals Provider/Stage fields
 * - Infer conditions from Notes + Attachment filenames (DBQs)
 */

import { loadEnvLocal } from '../lib/load-env-local.mjs';
import { getZohoAccessToken, zohoCrmCoql, zohoCrmGet } from '../lib/zoho.mjs';

loadEnvLocal();

const ZOHO_API_DOMAIN = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

function getArg(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return def;
  return v;
}

function norm(s) {
  return String(s || '').toLowerCase();
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function picklistContains(hay, needle) {
  return norm(hay).includes(norm(needle));
}

function extractConditionTags({ text }) {
  const t = norm(text);
  const tags = [];

  // Mental health / PTSD
  if (/(\bptsd\b|post[- ]?traumatic)/.test(t)) tags.push('PTSD');
  if (/(mental|depress|anxiety|panic|adhd|bipolar|schizo|ocd|mst|insomnia)/.test(t)) tags.push('Mental Health');

  // Common DBQs / conditions (expand as needed)
  if (/hypertension|high blood pressure/.test(t)) tags.push('Hypertension');
  if (/kidney|renal/.test(t)) tags.push('Kidney');
  if (/sleep apnea|osa/.test(t)) tags.push('Sleep Apnea');
  if (/tinnitus/.test(t)) tags.push('Tinnitus');
  if (/hearing/.test(t)) tags.push('Hearing');
  if (/back|spine|lumbar|cervical/.test(t)) tags.push('Back/Spine');
  if (/knee/.test(t)) tags.push('Knee');
  if (/shoulder/.test(t)) tags.push('Shoulder');
  if (/migrain|headache/.test(t)) tags.push('Migraines');
  if (/sinus|rhinitis|allergic rhinitis/.test(t)) tags.push('Rhinitis/Sinus');
  if (/gerd|reflux/.test(t)) tags.push('GERD');

  return uniq(tags);
}

async function listAllPages(pathAndQueryBase, accessToken) {
  // Best-effort pagination for Zoho related lists.
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

(async function main() {
  const days = Number(getArg('--days', '365'));
  const limit = Number(getArg('--limit', '200'));

  const accessToken = await getZohoAccessToken();

  // Focus on stages where provider decisions matter.
  const STAGES = [
    'Ready for Provider',
    'Sent to Provider',
    'Intake (Document Collection)',
  ];

  const stageList = STAGES.map(s => `'${s.replace(/'/g, "\\'")}'`).join(',');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const q = `select id, Deal_Name, Stage, Provider, Modified_Time from Deals where Stage in (${stageList}) and Modified_Time >= '${sinceIso}' order by Modified_Time desc limit ${limit}`;

  console.error('COQL:', q);
  const dealsRes = await zohoCrmCoql({ accessToken, apiDomain: ZOHO_API_DOMAIN, selectQuery: q });
  const deals = dealsRes?.data || [];

  const enriched = [];
  for (const d of deals) {
    const dealId = d.id;
    const provider = d.Provider || '';

    const notes = await getDealNotes({ accessToken, dealId });
    const attachments = await getDealAttachments({ accessToken, dealId });

    const noteText = notes
      .map(n => `${n?.Note_Title || ''}\n${n?.Note_Content || ''}`)
      .join('\n\n');
    const attachNames = attachments.map(a => a?.File_Name || a?.file_name || a?.name || '').filter(Boolean);

    const conditionTags = uniq([
      ...extractConditionTags({ text: `${d.Deal_Name} ${provider} ${noteText}` }),
      ...extractConditionTags({ text: attachNames.join(' ') }),
    ]);

    enriched.push({
      id: dealId,
      name: d.Deal_Name,
      stage: d.Stage,
      provider,
      modifiedTime: d.Modified_Time,
      conditionTags,
      attachments: attachNames,
    });
  }

  const isMental = (x) => x.conditionTags.includes('PTSD') || x.conditionTags.includes('Mental Health');
  const isSuntree = (x) => picklistContains(x.provider, 'suntree');
  const isAlina = (x) => picklistContains(x.provider, 'alina');
  const isNeura = (x) => picklistContains(x.provider, 'neura');

  const sentToSuntreeMental = enriched.filter(x => isSuntree(x) && isMental(x) && norm(x.stage).includes('sent'));
  const needsSuntreeMental = enriched.filter(x => !isSuntree(x) && isMental(x));
  const supposedAlinaOrNeura = enriched.filter(x => isAlina(x) || isNeura(x));

  const alinaNeuraByCondition = {};
  for (const x of supposedAlinaOrNeura) {
    const key = x.conditionTags.length ? x.conditionTags.join(' | ') : '(unknown)';
    alinaNeuraByCondition[key] = alinaNeuraByCondition[key] || [];
    alinaNeuraByCondition[key].push(x);
  }

  function fmtDeal(x) {
    const cond = x.conditionTags.length ? x.conditionTags.join(', ') : 'unknown';
    return `- ${x.name} (Deal ${x.id}) — Stage: ${x.stage} — Provider: ${x.provider || '—'} — Conditions: ${cond}`;
  }

  const report = [];
  report.push(`# Provider Transition Triage`);
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push(`Scope: last_${days}_days, limit ${limit}, stages: ${STAGES.join(', ')}`);
  report.push('');

  report.push(`## Sent to Suntree — PTSD / Mental Health (${sentToSuntreeMental.length})`);
  report.push(sentToSuntreeMental.length ? sentToSuntreeMental.map(fmtDeal).join('\n') : '- None found');
  report.push('');

  report.push(`## Needs to be sent to Suntree — PTSD / Mental Health (${needsSuntreeMental.length})`);
  report.push(needsSuntreeMental.length ? needsSuntreeMental.map(fmtDeal).join('\n') : '- None found');
  report.push('');

  report.push(`## Was supposed to be sent to Alina or NeuraHealth (${supposedAlinaOrNeura.length})`);
  report.push(supposedAlinaOrNeura.length ? supposedAlinaOrNeura.map(fmtDeal).join('\n') : '- None found');
  report.push('');

  report.push(`## Alina/Neura clients grouped by condition (${Object.keys(alinaNeuraByCondition).length})`);
  for (const k of Object.keys(alinaNeuraByCondition).sort()) {
    report.push(`### ${k} (${alinaNeuraByCondition[k].length})`);
    report.push(alinaNeuraByCondition[k].map(fmtDeal).join('\n'));
    report.push('');
  }

  const outPath = getArg('--out', `memory/provider-transition-triage-${new Date().toISOString().slice(0,10)}.md`);
  const jsonPath = getArg('--jsonOut', `memory/provider-transition-triage-${new Date().toISOString().slice(0,10)}.json`);

  const fs = await import('node:fs/promises');
  await fs.writeFile(outPath, report.join('\n'), 'utf8');
  await fs.writeFile(
    jsonPath,
    JSON.stringify({ days, limit, stages: STAGES, enriched, sentToSuntreeMental, needsSuntreeMental, supposedAlinaOrNeura, alinaNeuraByCondition }, null, 2),
    'utf8',
  );

  console.log(`Wrote ${outPath}`);
  console.log(`Wrote ${jsonPath}`);
  console.log('---');
  console.log(report.join('\n'));
})().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
