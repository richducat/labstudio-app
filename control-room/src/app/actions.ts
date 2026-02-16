'use server';

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readSafeButtons } from '@/lib/control-room/safeButtons';

const execFileAsync = promisify(execFile);

export async function runSafeJob(jobId: string) {
  const safe = await readSafeButtons();
  const allowed = safe.some((b) => b.jobId === jobId);
  if (!allowed) {
    throw new Error(`Job ${jobId} is not in the Safe Buttons allowlist`);
  }

  // NOTE: This relies on the hosting environment having access to the OpenClaw Gateway.
  // For local use, openclaw will use your configured gateway.remote.url and token.
  const { stdout, stderr } = await execFileAsync('openclaw', ['cron', 'run', jobId, '--expect-final', '--timeout', '600000'], {
    timeout: 610_000,
    maxBuffer: 1024 * 1024,
  });

  return {
    ok: true,
    stdout: stdout.trim().slice(0, 12_000),
    stderr: stderr.trim().slice(0, 12_000),
  };
}
