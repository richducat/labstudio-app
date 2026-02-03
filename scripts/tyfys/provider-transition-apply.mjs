#!/usr/bin/env node
/**
 * Apply provider-transition triage into Zoho:
 * - Add a standardized note
 * - Set Deals.next_step
 * - Create a Karen task per deal
 *
 * Usage:
 *   node scripts/tyfys/provider-transition-apply.mjs --in memory/provider-transition-triage-2026-02-03.json --dryRun true
 *   node scripts/tyfys/provider-transition-apply.mjs --in memory/provider-transition-triage-2026-02-03.json --dryRun false
 */

import { loadEnvLocal } from '../lib/load-env-local.mjs';
import { getZohoAccessToken, zohoCrmGet, zohoCrmPost, zohoCrmPut } from '../lib/zoho.mjs';
import fs from 'node:fs/promises';

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

function parseBool(v, def = false) {
  if (v == null) return def;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase().trim();
  if (['true','1','yes','y'].includes(s)) return true;
  if (['false','0','no','n'].includes(s)) return false;
  return def;
}

async function getZohoUserIdByName({ accessToken, contains }) {
  const res = await zohoCrmGet({ accessToken, apiDomain: ZOHO_API_DOMAIN, pathAndQuery: '/crm/v2/users?type=ActiveUsers&per_page=200' });
  const users = res?.users || res?.data || [];
  const hit = users.find(u => norm(u?.full_name || u?.name).includes(norm(contains)));
  return hit?.id || null;
}

function buildNote({ dealName, bucket, conditionTags }) {
  const cond = (conditionTags && conditionTags.length) ? conditionTags.join(', ') : 'TBD (review DBQs/notes)';
  return [
    `PROVIDER TRANSITION (auto-note)`,
    `Bucket: ${bucket}`,
    `Conditions (inferred): ${cond}`,
    `Context: Prior provider(s) no longer available (Alina/NeuraHealth). We are reassigning to an appropriate clinician ASAP to avoid delays.`,
    `Next steps: confirm required DBQs/Nexus items; assign replacement provider; send client reassurance email/update once scheduled.`,
  ].join('\n');
}

async function addDealNote({ accessToken, dealId, title, content, dryRun }) {
  if (dryRun) return { ok: true, dryRun: true };
  return zohoCrmPost({
    accessToken,
    apiDomain: ZOHO_API_DOMAIN,
    path: '/crm/v2/Notes',
    json: {
      data: [
        {
          Note_Title: title,
          Note_Content: content,
          Parent_Id: dealId,
          se_module: 'Deals',
        },
      ],
    },
  });
}

async function setDealNextStep({ accessToken, dealId, nextStep, dryRun }) {
  if (dryRun) return { ok: true, dryRun: true };
  return zohoCrmPut({
    accessToken,
    apiDomain: ZOHO_API_DOMAIN,
    path: `/crm/v2/Deals/${dealId}`,
    json: { data: [{ next_step: nextStep }] },
  });
}

async function createKarenTask({ accessToken, dealId, dealName, ownerId, dueDateISO, subject, desc, dryRun }) {
  if (dryRun) return { ok: true, dryRun: true };
  return zohoCrmPost({
    accessToken,
    apiDomain: ZOHO_API_DOMAIN,
    path: '/crm/v2/Tasks',
    json: {
      data: [
        {
          Subject: subject,
          Description: desc,
          Owner: ownerId ? { id: ownerId } : undefined,
          What_Id: dealId,
          $se_module: 'Deals',
          Due_Date: dueDateISO,
          Status: 'Not Started',
          Priority: 'High',
        },
      ],
    },
  });
}

(async function main() {
  const inPath = getArg('--in', null);
  if (!inPath) throw new Error('Missing --in <triage.json>');
  const dryRun = parseBool(getArg('--dryRun', 'true'), true);

  const accessToken = await getZohoAccessToken();

  const raw = JSON.parse(await fs.readFile(inPath, 'utf8'));
  const items = raw?.enriched || [];

  // Focus: anyone with Alina/Neura in provider OR PTSD/MH needing Suntree.
  const candidates = items.filter(x => {
    const p = norm(x.provider);
    const mental = (x.conditionTags || []).includes('PTSD') || (x.conditionTags || []).includes('Mental Health');
    const hasAlinaNeura = p.includes('alina') || p.includes('neura');
    const sentToSuntreeMental = p.includes('suntree') && mental && norm(x.stage).includes('sent');
    const needsSuntreeMental = !p.includes('suntree') && mental;
    return hasAlinaNeura || sentToSuntreeMental || needsSuntreeMental;
  });

  const karenId = await getZohoUserIdByName({ accessToken, contains: 'Karen' });

  const due = new Date();
  due.setDate(due.getDate() + 1);
  const dueISO = due.toISOString().slice(0, 10);

  let notesPlanned = 0;
  let nextStepsPlanned = 0;
  let tasksPlanned = 0;

  for (const x of candidates) {
    const p = norm(x.provider);
    const mental = (x.conditionTags || []).includes('PTSD') || (x.conditionTags || []).includes('Mental Health');

    let bucket = 'Provider transition: replacement clinician needed';
    if ((p.includes('alina') || p.includes('neura')) && mental) bucket = 'Provider transition: PTSD/MH — route to Suntree or MH replacement';
    else if (p.includes('alina') || p.includes('neura')) bucket = 'Provider transition: non-MH — replacement clinician needed';
    else if (mental && !p.includes('suntree')) bucket = 'Needs routing: PTSD/MH — should go to Suntree';
    else if (mental && p.includes('suntree')) bucket = 'Sent to Suntree: PTSD/MH — confirm scheduled + keep client warm';

    const nextStep = bucket;

    const note = buildNote({ dealName: x.name, bucket, conditionTags: x.conditionTags });

    await addDealNote({ accessToken, dealId: x.id, title: 'Provider transition triage', content: note, dryRun });
    notesPlanned++;

    await setDealNextStep({ accessToken, dealId: x.id, nextStep, dryRun });
    nextStepsPlanned++;

    const taskSubject = `Provider transition: reassign provider (${x.name})`;
    const desc = `Deal: ${x.name} (${x.id})\nBucket: ${bucket}\nConditions (inferred): ${(x.conditionTags||[]).join(', ') || 'TBD'}\n\nAction: confirm required DBQs/Nexus, assign replacement provider, and confirm client update is sent.`;

    await createKarenTask({ accessToken, dealId: x.id, dealName: x.name, ownerId: karenId, dueDateISO: dueISO, subject: taskSubject, desc, dryRun });
    tasksPlanned++;
  }

  console.log(`DONE provider-transition-apply dryRun=${dryRun}`);
  console.log(`candidates=${candidates.length} notes=${notesPlanned} next_steps=${nextStepsPlanned} tasks=${tasksPlanned}`);
  console.log(`karenOwnerId=${karenId || '(not found; tasks will be unassigned)'}`);
})().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
