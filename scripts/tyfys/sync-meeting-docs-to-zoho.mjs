#!/usr/bin/env node
/**
 * TYFYS: Sync meeting-note Google Docs (created by Zap) to Zoho Deal Attachments.
 *
 * Scope:
 * - Only Deals in stages: Intake (Document Collection), Ready for Provider, Sent to Provider
 * - Only meeting docs modified in last N days (default 60)
 * - Includes intake + MDBQ prep + intake coordination + 1:1s related to client deals
 *
 * Strategy:
 * - Use Drive full-text search via gog to find meeting note docs.
 * - Filter by modifiedTime (last N days).
 * - Match doc name to Deal_Name (case-insensitive substring match).
 * - Export each matching doc to PDF via gog docs export.
 * - Upload PDF to Zoho Deal Attachments.
 * - Deduplicate via state file keyed by docId+modifiedTime.
 *
 * Prereqs:
 * - gog authenticated for richard@thankyouforyourservice.co with drive+docs scopes
 * - Zoho envs present (.env.local)
 *
 * Usage:
 *   node scripts/tyfys/sync-meeting-docs-to-zoho.mjs --days 60 --maxDocs 500
 *   node scripts/tyfys/sync-meeting-docs-to-zoho.mjs --days 60 --dry-run
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { loadEnvLocal } from '../lib/load-env-local.mjs';
import { getZohoAccessToken, zohoCrmUploadAttachment } from '../lib/zoho.mjs';

loadEnvLocal();
process.stdout.on('error', () => {});

const GACC = 'richard@thankyouforyourservice.co';
const OUT_DIR = path.resolve('memory/meeting-doc-pdfs');
const STATE_PATH = path.resolve('memory/tyfys-meeting-doc-sync.json');

function getArg(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return def;
  return v;
}

const days = Number(getArg('--days', '60'));
const maxDocs = Number(getArg('--maxDocs', '800'));
const dryRun = process.argv.includes('--dry-run');

async function readJson(p, fallback) {
  try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return fallback; }
}

async function writeJson(p, obj) {
  if (dryRun) return;
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function shJson(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(res.stderr || res.stdout || `Command failed: ${cmd} ${args.join(' ')}`);
  }
  return JSON.parse(res.stdout || '{}');
}

function safeFilename(s) {
  return String(s || 'doc').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 180);
}

function parseIso(v) {
  const ms = new Date(v).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function matchDeal({ docName, deals }) {
  const dn = norm(docName);
  // Prefer longer names first to avoid substring collisions.
  for (const d of deals) {
    const n = norm(d.Deal_Name);
    if (!n) continue;
    if (dn.includes(n)) return d;
  }
  // fallback: handle common variations
  // ex: "Robby mclean" vs "Robert mclean"
  for (const d of deals) {
    const n = norm(d.Deal_Name);
    if (!n) continue;
    const last = n.split(' ').slice(-1)[0];
    if (last && dn.includes(last) && dn.includes(n.split(' ')[0])) return d;
  }
  return null;
}

async function main() {
  const pipeline = await readJson('memory/pipeline-deals-60d.json', null);
  if (!pipeline?.deals?.length) throw new Error('Missing memory/pipeline-deals-60d.json (run pipeline export first)');

  const deals = [...pipeline.deals];
  deals.sort((a, b) => (String(b.Deal_Name || '').length - String(a.Deal_Name || '').length));

  const state = await readJson(STATE_PATH, { uploaded: {} });

  const sinceMs = Date.now() - days * 24 * 3600 * 1000;

  // Broad query to catch the naming patterns we saw.
  const queries = [
    '"Notes by Gemini"',
    '"New Client Onboarding and Intake"',
    '"MDBQ Prep and Review"',
    '"Intake Coordination"',
    '"One on one with Richard"',
    '"Meeting started"',
  ];

  let files = [];
  for (const q of queries) {
    let page = '';
    for (;;) {
      const args = ['--json', 'drive', 'search', q, '--max', '200', '--account', GACC];
      if (page) args.push('--page', page);
      const out = shJson('gog', args);
      const batch = out.files || [];
      files = files.concat(batch);
      page = out.nextPageToken || '';
      if (!page) break;
      if (files.length >= maxDocs) break;
    }
    if (files.length >= maxDocs) break;
  }

  // de-dupe by id
  const byId = new Map();
  for (const f of files) {
    if (!f?.id) continue;
    // Prefer the newest modifiedTime if duplicates
    const prev = byId.get(f.id);
    if (!prev) byId.set(f.id, f);
    else {
      const a = parseIso(prev.modifiedTime) || 0;
      const b = parseIso(f.modifiedTime) || 0;
      if (b > a) byId.set(f.id, f);
    }
  }
  files = [...byId.values()];

  // Filter to docs only and last N days
  files = files
    .filter(f => f.mimeType === 'application/vnd.google-apps.document')
    .filter(f => {
      const ms = parseIso(f.modifiedTime);
      return ms != null && ms >= sinceMs;
    })
    .sort((a, b) => (parseIso(b.modifiedTime) || 0) - (parseIso(a.modifiedTime) || 0));

  await fs.mkdir(OUT_DIR, { recursive: true });

  const zohoToken = await getZohoAccessToken();
  const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

  let scanned = 0;
  let matched = 0;
  let uploaded = 0;
  let skippedNoDeal = 0;
  let skippedAlready = 0;

  for (const f of files) {
    if (scanned >= maxDocs) break;
    scanned += 1;

    const docId = f.id;
    const docName = f.name || docId;
    const mod = f.modifiedTime || '';
    const key = `${docId}:${mod}`;

    if (state.uploaded[key]) {
      skippedAlready += 1;
      continue;
    }

    const deal = matchDeal({ docName, deals });
    if (!deal) {
      skippedNoDeal += 1;
      continue;
    }

    matched += 1;

    const outPath = path.join(OUT_DIR, `${safeFilename(docName)}.pdf`);

    if (!dryRun) {
      // Export doc to PDF
      spawnSync('gog', ['docs', 'export', docId, '--format', 'pdf', '--out', outPath, '--account', GACC], { encoding: 'utf8', stdio: 'inherit' });

      // Upload to Zoho
      await zohoCrmUploadAttachment({
        accessToken: zohoToken,
        apiDomain,
        module: 'Deals',
        recordId: String(deal.id),
        filePath: outPath,
      });
    }

    state.uploaded[key] = {
      docId,
      docName,
      modifiedTime: mod,
      dealId: String(deal.id),
      dealName: deal.Deal_Name,
      uploadedAt: new Date().toISOString(),
      dryRun,
    };
    await writeJson(STATE_PATH, state);

    uploaded += 1;
    process.stdout.write(`uploaded: ${deal.Deal_Name} <= ${docName}\n`);
  }

  process.stdout.write(
    `\nDONE meeting-doc sync (last ${days}d) scanned=${scanned} matched=${matched} uploaded=${uploaded} skippedNoDeal=${skippedNoDeal} skippedAlready=${skippedAlready}\n`,
  );
}

await main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
