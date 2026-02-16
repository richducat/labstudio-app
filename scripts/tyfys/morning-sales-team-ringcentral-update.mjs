#!/usr/bin/env node
/**
 * Morning sales team RingCentral update (cron-safe entrypoint)
 *
 * Historically referenced by cron; restored here as a stable wrapper.
 *
 * Current behavior:
 *  - Generates a WhatsApp-friendly activity brief (RingCentral + Zoho) by
 *    invoking the existing daily-sales-ops-brief logic.
 *  - Prints to stdout (send/delivery handled elsewhere).
 *
 * Usage:
 *  node scripts/tyfys/morning-sales-team-ringcentral-update.mjs --hours 24
 */

import { loadEnvLocal } from '../lib/load-env-local.mjs';

loadEnvLocal();

function getArg(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return def;
  return v;
}

const hours = Number(getArg('--hours', '24'));

// We can't easily import + call the IIFE in daily-sales-ops-brief.mjs without refactoring.
// So we spawn a node process and stream its stdout. This keeps this script tiny and robust.
import { spawn } from 'node:child_process';

const child = spawn(process.execPath, ['scripts/tyfys/daily-sales-ops-brief.mjs', '--hours', String(hours)], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

let out = '';
let err = '';
child.stdout.on('data', (d) => (out += d));
child.stderr.on('data', (d) => (err += d));

child.on('close', (code) => {
  if (out) process.stdout.write(out);
  if (err) process.stderr.write(err);
  process.exit(code || 0);
});
