import type { CronJob, WorkOrder } from './types';

function pickNotes(job: CronJob) {
  const p: any = job.payload;
  const text = p?.text || p?.message || '';
  return String(text).slice(0, 180);
}

function isHumanReminder(job: CronJob) {
  const p: any = job.payload;
  const t = String(p?.text || p?.message || '').toLowerCase();
  if (!t) return false;
  // Heuristic: these are the ones that normally represent "a work order" rather than an always-on daemon.
  return (
    p?.kind === 'systemEvent' ||
    t.includes('reminder') ||
    t.includes('draft only') ||
    t.includes('approval needed')
  );
}

export function buildWorkOrders(jobs: CronJob[], nowMs = Date.now()): WorkOrder[] {
  const items: WorkOrder[] = [];

  for (const job of jobs) {
    if (!job.enabled) continue;
    if (!isHumanReminder(job)) continue;

    const dueAtMs = job.state?.nextRunAtMs;
    const overdue = typeof dueAtMs === 'number' && dueAtMs < nowMs;
    const soon = typeof dueAtMs === 'number' && dueAtMs < nowMs + 24 * 60 * 60 * 1000;

    const status: WorkOrder['status'] = overdue ? 'due' : soon ? 'upcoming' : 'info';

    items.push({
      id: job.id,
      title: job.name,
      dueAtMs,
      status,
      source: 'cron',
      jobId: job.id,
      jobName: job.name,
      notes: pickNotes(job),
    });
  }

  return items
    .sort((a, b) => {
      const ad = a.dueAtMs ?? Number.MAX_SAFE_INTEGER;
      const bd = b.dueAtMs ?? Number.MAX_SAFE_INTEGER;
      return ad - bd;
    })
    .slice(0, 25);
}
