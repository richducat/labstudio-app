#!/usr/bin/env node
/**
 * Send provider outreach emails from a drafts markdown bundle.
 *
 * SAFETY:
 * - Default is --dry-run (prints what would be sent)
 * - To send, pass --send
 *
 * Example:
 *   node scripts/tyfys/send-provider-outreach-emails.mjs \
 *     --in memory/provider-outreach-drafts-2026-02-04.md \
 *     --account richard@thankyouforyourservice.co \
 *     --cc karen@thankyouforyourservice.co --cc devin@thankyouforyourservice.co \
 *     --send
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function getArg(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return def;
  return v;
}

function getArgs(name) {
  const out = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === name) {
      const v = process.argv[i + 1];
      if (v && !v.startsWith('--')) out.push(v);
    }
  }
  return out;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function parseDrafts(md) {
  // Split on headings like "## Name — Location"
  const parts = md.split(/\n## /g);
  const header = parts.shift() || '';

  const drafts = [];
  for (const part of parts) {
    const block = '## ' + part;
    const lines = block.split(/\n/);
    const title = lines[0].replace(/^##\s*/, '').trim();

    const emailLine = lines.find(l => l.startsWith('Email: ')) || '';
    const to = emailLine.replace('Email: ', '').trim();
    if (!to) continue;

    const subjLineIdx = lines.findIndex(l => l.startsWith('Subject: '));
    if (subjLineIdx === -1) continue;
    const subject = lines[subjLineIdx].replace('Subject: ', '').trim();
    const catMatch = subject.match(/\(([^)]+)\)\s*$/);
    const category = catMatch ? catMatch[1].trim() : '';

    // Body starts after blank line following Subject:
    const bodyStartIdx = subjLineIdx + 1;
    let body = lines.slice(bodyStartIdx).join('\n');
    body = body.replace(/^\n+/, '');

    // Trim trailing separators
    body = body.replace(/\n---\n[\s\S]*$/m, '').trimEnd();

    drafts.push({ title, to, subject, category, body });
  }

  return drafts;
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'inherit' });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed with exit ${res.status}`);
  }
}

(async function main() {
  const inPath = getArg('--in', 'memory/provider-outreach-drafts-2026-02-04.md');
  const account = getArg('--account', 'richard@thankyouforyourservice.co');
  const ccs = getArgs('--cc');
  const send = hasFlag('--send');

  const md = await fs.readFile(path.resolve(inPath), 'utf8');
  const drafts = parseDrafts(md);

  if (!drafts.length) {
    console.log('No drafts found in input:', inPath);
    process.exit(1);
  }

  // Deduplicate by recipient email. If multiple drafts target the same email,
  // merge categories and send a single email.
  const byTo = new Map();
  for (const d of drafts) {
    const key = d.to.toLowerCase();
    const existing = byTo.get(key);
    if (!existing) {
      byTo.set(key, { ...d, categories: d.category ? [d.category] : [] });
    } else {
      if (d.category && !existing.categories.includes(d.category)) existing.categories.push(d.category);
    }
  }

  const uniqueDrafts = [...byTo.values()];

  console.log(`Drafts parsed: ${drafts.length}`);
  console.log(`Unique recipients: ${uniqueDrafts.length}`);
  console.log(`Mode: ${send ? 'SEND' : 'DRY RUN'}`);
  console.log(`From account: ${account}`);
  console.log(`CC: ${ccs.join(', ') || '(none)'}`);
  console.log('---');

  const tmpDir = path.resolve('memory/outreach-email-bodies');
  await fs.mkdir(tmpDir, { recursive: true });

  for (let i = 0; i < uniqueDrafts.length; i++) {
    const d = uniqueDrafts[i];

    // If we merged categories, add a short note near the top.
    if (d.categories && d.categories.length > 1) {
      d.subject = 'VA DBQ / Nexus Letter Provider Inquiry (' + d.categories.join(' + ') + ')';
      d.body = d.body.replace(/Based on your background, you may be a fit for [^.]+\./, (m) => {
        return `Based on your background, you may be a fit for ${d.categories.join(' + ')}.`;
      });
    }

    const bodyPath = path.join(tmpDir, `email-${String(i + 1).padStart(2, '0')}.txt`);
    await fs.writeFile(bodyPath, d.body + '\n', 'utf8');

    console.log(`[${i + 1}/${uniqueDrafts.length}] ${d.to} :: ${d.subject}`);

    if (!send) continue;

    const args = [
      'gmail',
      'send',
      '--account',
      account,
      '--to',
      d.to,
      ...ccs.flatMap(cc => ['--cc', cc]),
      '--subject',
      d.subject,
      '--body-file',
      bodyPath,
    ];

    run('gog', args);
    console.log('');
  }

  console.log(send ? 'DONE sending.' : 'DONE (dry run).');
})().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
