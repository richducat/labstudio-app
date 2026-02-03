#!/usr/bin/env node
/**
 * Sync client email attachments from Gmail into Zoho Deal Attachments.
 *
 * Default scope: HIT LIST deals for Richard’s Devin+Karen triage.
 *
 * Requirements:
 * - gog CLI authenticated for richard@thankyouforyourservice.co
 * - Zoho OAuth envs present (.env.local)
 *
 * Usage:
 *   node scripts/tyfys/sync-client-email-attachments-to-zoho.mjs --days 180 --maxPerClient 50
 *   node scripts/tyfys/sync-client-email-attachments-to-zoho.mjs --dealId <id> [--days 365]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { loadEnvLocal } from '../lib/load-env-local.mjs';
import { getZohoAccessToken, zohoCrmCoql, zohoCrmGet, zohoCrmUploadAttachment } from '../lib/zoho.mjs';

loadEnvLocal();
process.stdout.on('error', () => {});

const GMAIL_ACCOUNT = process.env.GMAIL_ACCOUNT || 'richard@thankyouforyourservice.co';
const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

const HITLIST_NAMES = [
  'John Aleman',
  'John Rensel',
  'James Barker',
  'Joseph Scott birchell',
  'Eric Lozano Jr.',
  'Brandon Guerra',
  'Jason Manning',
  'Mark Jamison',
  'Nathaniel Shields-Koszarek',
  'Robert Ellerd',
];

function getArg(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return def;
  return v;
}

const onlyDealId = getArg('--dealId', null);
const days = Number(getArg('--days', '180'));
const maxPerClient = Number(getArg('--maxPerClient', '50'));
const dryRun = process.argv.includes('--dry-run');

const STATE_PATH = path.resolve('memory/tyfys-email-attachments-sync.json');
const OUT_DIR = path.resolve('memory/email-attachments');

async function readState() {
  try {
    return JSON.parse(await fs.readFile(STATE_PATH, 'utf8'));
  } catch {
    return { uploaded: {} };
  }
}

async function writeState(s) {
  if (dryRun) return;
  await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
  await fs.writeFile(STATE_PATH, JSON.stringify(s, null, 2) + '\n', 'utf8');
}

function sh(cmd, args, { json = false } = {}) {
  const fullArgs = [...args];
  if (json) fullArgs.unshift('--json');
  const res = spawnSync(cmd, fullArgs, { encoding: 'utf8' });
  if (res.status !== 0) {
    const msg = res.stderr || res.stdout || `Command failed: ${cmd} ${fullArgs.join(' ')}`;
    throw new Error(msg);
  }
  return res.stdout;
}

function escZoho(s) {
  return String(s || '').replace(/'/g, "\\'");
}

function flattenParts(payload) {
  const out = [];
  const walk = (p) => {
    if (!p) return;
    out.push(p);
    for (const c of p.parts || []) walk(c);
  };
  walk(payload);
  return out;
}

function attachmentPartsFromMessage(msg) {
  // gog gmail get --json exposes a friendly top-level "attachments" list.
  if (Array.isArray(msg?.attachments) && msg.attachments.length) {
    return msg.attachments
      .filter(a => a?.filename && a?.attachmentId)
      .map(a => ({ filename: a.filename, attachmentId: a.attachmentId, mimeType: a.mimeType }));
  }

  // Fallback: raw Gmail payload tree
  const payload = msg?.payload;
  const parts = flattenParts(payload);
  const out = [];
  for (const p of parts) {
    const filename = p?.filename;
    const attId = p?.body?.attachmentId;
    const size = Number(p?.body?.size) || 0;
    if (filename && attId && size > 0) out.push({ filename, attachmentId: attId, mimeType: p?.mimeType });
  }
  return out;
}

function safeFilename(s) {
  return String(s || 'file').replace(/[\\/:*?\"<>|]+/g, '_');
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function fetchDealsForHitlist({ zohoToken }) {
  if (onlyDealId) {
    const j = await zohoCrmGet({ accessToken: zohoToken, apiDomain, pathAndQuery: `/crm/v2/Deals/${onlyDealId}` });
    return j?.data || [];
  }

  const q = `select id, Deal_Name, Stage, Owner, Email_Address, Phone_Number, Provider, Appointment_Status, Next_Step, Veteran_Live_Status, Modified_Time from Deals where Deal_Name in (${HITLIST_NAMES.map((n) => `'${escZoho(n)}'`).join(',')}) limit 50`;
  const res = await zohoCrmCoql({ accessToken: zohoToken, apiDomain, selectQuery: q });
  return res?.data || [];
}

async function syncDeal({ zohoToken, state, deal }) {
  const dealId = String(deal.id);
  const dealName = deal.Deal_Name;
  const email = (deal.Email_Address || '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    process.stdout.write(`- SKIP ${dealName} (${dealId}): no Email_Address\n`);
    return { dealId, dealName, scanned: 0, attachmentsFound: 0, uploaded: 0, skippedAlready: 0 };
  }

  const newerThan = `newer_than:${Math.max(1, days)}d`;
  // Keep query tight: direct emails from client to Richard with attachments.
  const query = `from:${email} to:${GMAIL_ACCOUNT} has:attachment ${newerThan}`;

  const searchJson = sh('gog', ['gmail', 'messages', 'search', query, '--max', String(maxPerClient), '--account', GMAIL_ACCOUNT], { json: true });
  const search = JSON.parse(searchJson || '{}');
  const msgs = Array.isArray(search) ? search : (search?.messages || []);

  let attachmentsFound = 0;
  let uploaded = 0;
  let skippedAlready = 0;

  for (const m of msgs) {
    const messageId = m.id;
    const keyBase = `${dealId}:${messageId}`;

    const fullJson = sh('gog', ['gmail', 'get', messageId, '--account', GMAIL_ACCOUNT], { json: true });
    const full = JSON.parse(fullJson || '{}');

    const atts = attachmentPartsFromMessage(full);
    attachmentsFound += atts.length;

    for (const a of atts) {
      const attKey = `${keyBase}:${a.attachmentId}`;
      if (state.uploaded[attKey]) {
        skippedAlready += 1;
        continue;
      }

      const dir = path.join(OUT_DIR, dealId, messageId);
      await ensureDir(dir);
      const localPath = path.join(dir, safeFilename(a.filename));

      if (!dryRun) {
        // Download attachment
        sh('gog', ['gmail', 'attachment', messageId, a.attachmentId, '--out', localPath, '--account', GMAIL_ACCOUNT]);

        // Upload to Zoho Deal attachments
        await zohoCrmUploadAttachment({
          accessToken: zohoToken,
          apiDomain,
          module: 'Deals',
          recordId: dealId,
          filePath: localPath,
        });
      }

      state.uploaded[attKey] = {
        dealId,
        dealName,
        email,
        messageId,
        attachmentId: a.attachmentId,
        filename: a.filename,
        uploadedAt: new Date().toISOString(),
        dryRun,
      };

      uploaded += 1;
    }
  }

  return {
    dealId,
    dealName,
    email,
    scanned: msgs.length,
    attachmentsFound,
    uploaded,
    skippedAlready,
  };
}

(async function main() {
  const zohoToken = await getZohoAccessToken();
  const state = await readState();

  const deals = await fetchDealsForHitlist({ zohoToken });
  if (!deals.length) {
    process.stdout.write('No deals found for scope.\n');
    return;
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  process.stdout.write(`Syncing Gmail → Zoho Attachments (account=${GMAIL_ACCOUNT}) days=${days} maxPerClient=${maxPerClient}${dryRun ? ' DRY_RUN' : ''}\n`);

  const results = [];
  for (const d of deals) {
    process.stdout.write(`\n=== ${d.Deal_Name} (${d.id}) ===\n`);
    const r = await syncDeal({ zohoToken, state, deal: d });
    results.push(r);
    await writeState(state);
    process.stdout.write(`scanned_msgs=${r.scanned} attachments_found=${r.attachmentsFound} uploaded=${r.uploaded} skipped_already=${r.skippedAlready}\n`);
  }

  const totals = results.reduce(
    (acc, r) => {
      acc.deals += 1;
      acc.scanned += r.scanned;
      acc.attachmentsFound += r.attachmentsFound;
      acc.uploaded += r.uploaded;
      acc.skippedAlready += r.skippedAlready;
      return acc;
    },
    { deals: 0, scanned: 0, attachmentsFound: 0, uploaded: 0, skippedAlready: 0 },
  );

  process.stdout.write(`\nDONE totals: deals=${totals.deals} scanned_msgs=${totals.scanned} attachments_found=${totals.attachmentsFound} uploaded=${totals.uploaded} skipped_already=${totals.skippedAlready}\n`);
})().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
