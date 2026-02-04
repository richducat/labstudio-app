#!/usr/bin/env node
/**
 * Generate outreach email drafts (NOT sending) to providers.
 * Source: TYFYS public provider portal.
 *
 * Usage:
 *   node scripts/tyfys/generate-provider-outreach-drafts.mjs --out memory/provider-outreach-drafts-YYYY-MM-DD.md
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

function pickCategory(p) {
  const s = norm((p.specialty || []).join(' ') + ' ' + p.services);
  if (s.includes('toxic exposure') || s.includes('occupational')) return 'Toxic Exposure';
  if (s.includes('back/lumbar') || s.includes('spine')) return 'Back/Spine';
  if (s.includes('neck') || s.includes('cervical')) return 'Neck';
  if (s.includes('sleep apnea')) return 'Sleep Apnea';
  if (s.includes('ptsd')) return 'PTSD';
  if (s.includes('mental health') || s.includes('psychology') || s.includes('psychiatry')) return 'Mental Health';
  if (s.includes('headaches/migraines') || s.includes('migraine')) return 'Headaches/Migraines';
  if (s.includes('orthopedic') || s.includes('msk')) return 'Orthopedic/MSK';
  return (p.specialty || [])[0] || 'General';
}

function renderEmail({ provider, category }) {
  const subject = `VA DBQ / Nexus Letter Provider Inquiry (${category})`;

  const body = `Hi ${provider.name},\n\nMy name is Richard Ducat — I’m reaching out from Thank You For Your Service (TYFYS). We help veterans coordinate medical evidence for VA disability claims, and we’re expanding our trusted provider bench.\n\nWe’re looking for licensed clinicians (MD/DO/PhD/PA-C/NP) who can reliably complete DBQs and/or provide nexus opinions in a clinically sound, well-supported way. Based on your background, you may be a fit for ${category}.\n\nA few quick questions:\n1) Are you currently accepting new veterans for DBQs and/or nexus letters?\n2) Do you offer telehealth and/or multi-state coverage? If so, which states?\n3) Typical turnaround time and pricing range?\n4) Any conditions you prefer to focus on (and any you avoid)?\n\nIf you’re open to it, I’d love to set up a short intro call with you. I’m CC’ing our team members Karen and Devin so we can coordinate next steps.\n\nThanks,\nRichard Ducat\nThank You For Your Service (TYFYS)\nhttps://tyfys.net\n\nCC: karen@thankyouforyourservice.co, devin@thankyouforyourservice.co`;

  return { subject, body };
}

(async function main() {
  const outPath = getArg('--out', path.resolve(`memory/provider-outreach-drafts-${new Date().toISOString().slice(0, 10)}.md`));
  const max = Number(getArg('--max', '40'));

  const providers = await fetchTyfysPortalProviders();

  // Candidates: must have an email, and not be an off-limits competitor.
  const candidates = providers
    .filter(p => p.email && !providerLooksCompetitor(p))
    .sort((a, b) => String(a.state).localeCompare(String(b.state)) || String(a.name).localeCompare(String(b.name)));

  const lines = [];
  lines.push(`# Provider outreach drafts (TYFYS)`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Source: https://tyfys.net/drportal.html (public directory)`);
  lines.push('');
  lines.push(`Rules:`);
  lines.push(`- From: Richard Ducat`);
  lines.push(`- CC: karen@thankyouforyourservice.co, devin@thankyouforyourservice.co`);
  lines.push(`- Excluded: VetLink Solutions, REE Medical, Prestige Veteran Medical Consulting`);
  lines.push('');

  let count = 0;
  for (const p of candidates) {
    const category = pickCategory(p);
    const { subject, body } = renderEmail({ provider: p, category });

    lines.push(`## ${p.name} — ${p.county || ''}${p.county ? ', ' : ''}${p.state || ''}`);
    lines.push(`Email: ${p.email}`);
    lines.push(`Category: ${category}`);
    lines.push('');
    lines.push(`Subject: ${subject}`);
    lines.push('');
    lines.push(body);
    lines.push('');
    lines.push('---');
    lines.push('');

    count += 1;
    if (count >= max) break;
  }

  if (count === 0) {
    lines.push('No candidates found with email addresses in the portal directory (after exclusions).');
  }

  await fs.writeFile(outPath, lines.join('\n'), 'utf8');
  console.log(`Wrote ${outPath} (drafts=${count})`);
})().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
