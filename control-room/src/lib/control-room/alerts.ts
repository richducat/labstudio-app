import fs from 'node:fs/promises';
import path from 'node:path';
import { getCronRunsDir } from './paths';
import type { AlertItem, CronJob } from './types';

function isTokenFailure(s?: string) {
  if (!s) return false;
  const t = s.toLowerCase();
  return (
    t.includes('invalid_grant') ||
    t.includes('refresh token') ||
    t.includes('token') && t.includes('expired') ||
    t.includes('unauthorized') ||
    t.includes('401')
  );
}

function isDriftGuard(jobName?: string) {
  if (!jobName) return false;
  return jobName.toLowerCase().includes('driftguard');
}

export async function buildAlertsFromCronStore(jobs: CronJob[]): Promise<AlertItem[]> {
  const now = Date.now();
  const alerts: AlertItem[] = [];

  for (const job of jobs) {
    if (!job.enabled) continue;

    const lastStatus = job.state?.lastStatus;
    const consecutiveErrors = job.state?.consecutiveErrors ?? 0;
    const lastError = job.state?.lastError;
    const runningAtMs = job.state?.runningAtMs;

    if (runningAtMs && now - runningAtMs > 10 * 60 * 1000) {
      alerts.push({
        tsMs: runningAtMs,
        severity: 'critical',
        kind: 'stuck',
        title: 'Job appears stuck (running >10m)',
        detail: `${job.name} (${job.id})`,
        jobId: job.id,
        jobName: job.name,
      });
    }

    if (lastStatus === 'error' || consecutiveErrors > 0) {
      const severity = isTokenFailure(lastError) ? 'critical' : isDriftGuard(job.name) ? 'critical' : 'warn';
      const kind = isTokenFailure(lastError) ? 'tokenFailure' : isDriftGuard(job.name) ? 'driftGuard' : 'cronError';
      alerts.push({
        tsMs: job.state?.lastRunAtMs ?? now,
        severity,
        kind,
        title: `${kind === 'tokenFailure' ? 'Token failure' : kind === 'driftGuard' ? 'DriftGuard issue' : 'Cron job error'}`,
        detail: `${job.name} — ${lastError ?? 'error'}`,
        jobId: job.id,
        jobName: job.name,
      });
    }
  }

  // Sort newest first
  return alerts.sort((a, b) => b.tsMs - a.tsMs).slice(0, 50);
}

export async function buildAlertsFromRunHistory({
  jobs,
  lookbackHours = 24,
  maxItems = 50,
}: {
  jobs: CronJob[];
  lookbackHours?: number;
  maxItems?: number;
}): Promise<AlertItem[]> {
  const jobById = new Map(jobs.map((j) => [j.id, j] as const));
  const dir = getCronRunsDir();
  const now = Date.now();
  const cutoff = now - lookbackHours * 60 * 60 * 1000;

  let files: string[] = [];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }

  // Only consider run files for jobs we know about.
  const candidates = files
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => ({ file: f, jobId: f.replace(/\.jsonl$/, '') }))
    .filter(({ jobId }) => jobById.has(jobId));

  // Read last chunk of each file (cheap-ish) and parse errors.
  const alerts: AlertItem[] = [];
  for (const { file, jobId } of candidates) {
    const full = path.join(dir, file);
    let raw = '';
    try {
      raw = await fs.readFile(full, 'utf8');
    } catch {
      continue;
    }

    const lines = raw.trim().split('\n');
    const tail = lines.slice(Math.max(0, lines.length - 200));
    for (const line of tail) {
      if (!line.trim()) continue;
      try {
        const evt = JSON.parse(line) as any;
        const tsMs = typeof evt.ts === 'number' ? evt.ts : typeof evt.runAtMs === 'number' ? evt.runAtMs : 0;
        if (!tsMs || tsMs < cutoff) continue;
        if (evt.action !== 'finished') continue;
        if (evt.status !== 'error') continue;
        const summary = String(evt.summary || evt.error || evt.lastError || '').slice(0, 500);
        const job = jobById.get(jobId);
        const severity = isTokenFailure(summary) ? 'critical' : isDriftGuard(job?.name) ? 'critical' : 'warn';
        const kind = isTokenFailure(summary) ? 'tokenFailure' : isDriftGuard(job?.name) ? 'driftGuard' : 'cronError';
        alerts.push({
          tsMs,
          severity,
          kind,
          title: kind === 'tokenFailure' ? 'Token failure (from run log)' : kind === 'driftGuard' ? 'DriftGuard error (from run log)' : 'Cron run error',
          detail: `${job?.name ?? jobId} — ${summary || 'error'}`,
          jobId,
          jobName: job?.name,
        });
      } catch {
        // ignore parse errors
      }
    }
  }

  return alerts.sort((a, b) => b.tsMs - a.tsMs).slice(0, maxItems);
}
