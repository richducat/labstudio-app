#!/usr/bin/env node
/**
 * Indeed inbox watcher (Gmail via gog)
 *
 * Checks Gmail for Indeed-related messages and prints a short summary for any
 * messages not seen before.
 *
 * Designed to be run on a schedule (every ~3h).
 * Stores state in: /Users/richardducat/clawd/memory/indeed-watch.json
 *
 * Usage:
 *   node scripts/personal/indeed-inbox-watch.mjs \
 *     --account richducat@gmail.com \
 *     --query "in:inbox newer_than:7d (from:indeed.com OR subject:Indeed OR indeed)" \
 *     --max 25
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function arg(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return def;
  return v;
}

const account = arg('--account', process.env.GOG_ACCOUNT || 'richducat@gmail.com');
const query = arg('--query', 'in:inbox newer_than:7d (from:indeed.com OR subject:Indeed OR indeed)');
const max = Number(arg('--max', '25'));

const STATE_PATH = path.resolve('memory/indeed-watch.json');

async function readState() {
  try {
    return JSON.parse(await fs.readFile(STATE_PATH, 'utf8'));
  } catch {
    return { seenMessageIds: [], updatedAtMs: null };
  }
}

async function writeState(state) {
  await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString('en-US');
  } catch {
    return iso;
  }
}

async function gogJson(args) {
  const { stdout } = await execFileAsync('gog', [...args, '--json'], {
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, GOG_ACCOUNT: account },
  });
  return JSON.parse(stdout);
}

function normalizeMessage(m) {
  // gog schemas can drift; handle common fields
  const id = m.id || m.messageId || m.msgId;
  const threadId = m.threadId || m.thread_id;
  const internalDate = m.internalDate || m.internal_date;
  const snippet = m.snippet || '';

  const headers = m.payload?.headers || m.headers || [];
  const getHeader = (name) => {
    const h = headers.find((x) => String(x.name || x.key || '').toLowerCase() === name.toLowerCase());
    return h?.value || h?.val || null;
  };

  return {
    id,
    threadId,
    date: getHeader('Date') || internalDate,
    from: getHeader('From') || m.from || null,
    subject: getHeader('Subject') || m.subject || null,
    snippet,
  };
}

(async function main() {
  const state = await readState();
  const seen = new Set(state.seenMessageIds || []);

  // Use messages search (not threads) to avoid missing new replies inside existing threads.
  const res = await gogJson(['gmail', 'messages', 'search', query, '--max', String(max), '--account', account]);
  const msgs = Array.isArray(res) ? res : res?.messages || res?.data || [];

  const normalized = msgs.map(normalizeMessage).filter((m) => m.id);

  const fresh = normalized.filter((m) => !seen.has(m.id));

  // Update state with all current ids (cap size)
  const nextSeen = [...new Set([...normalized.map((m) => m.id), ...seen])].slice(0, 2000);
  await writeState({ seenMessageIds: nextSeen, updatedAtMs: Date.now(), account, query });

  if (!fresh.length) {
    console.log(`Indeed inbox watch: no new matches (${account}).`);
    return;
  }

  // Print a short, pasteable summary.
  console.log(`Indeed inbox watch: ${fresh.length} new message(s) (${account})`);
  for (const m of fresh.slice(0, 10)) {
    const when = m.date ? fmtDate(m.date) : '—';
    const subj = m.subject || '(no subject)';
    const from = m.from || '(unknown sender)';
    const snip = String(m.snippet || '').replace(/\s+/g, ' ').trim().slice(0, 140);
    console.log(`- ${when} | ${subj} | ${from}`);
    if (snip) console.log(`  ${snip}`);
  }
})().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
