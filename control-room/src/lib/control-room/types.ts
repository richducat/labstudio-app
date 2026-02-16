export type CronJob = {
  id: string;
  agentId?: string;
  name: string;
  enabled: boolean;
  deleteAfterRun?: boolean;
  createdAtMs?: number;
  updatedAtMs?: number;
  schedule:
    | { kind: 'cron'; expr: string; tz?: string }
    | { kind: 'every'; everyMs: number; anchorMs?: number }
    | { kind: 'at'; at: string };
  sessionTarget?: 'main' | 'isolated';
  wakeMode?: 'now' | 'next-heartbeat';
  payload?:
    | { kind: 'systemEvent'; text: string }
    | { kind: 'agentTurn'; message: string; timeoutSeconds?: number; model?: string };
  delivery?: { mode?: string; channel?: string; to?: string };
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: 'ok' | 'error';
    lastDurationMs?: number;
    consecutiveErrors?: number;
    lastError?: string;
    runningAtMs?: number;
  };
};

export type CronStore = { jobs: CronJob[] };

export type AlertSeverity = 'info' | 'warn' | 'critical';

export type AlertItem = {
  tsMs: number;
  severity: AlertSeverity;
  title: string;
  detail?: string;
  jobId?: string;
  jobName?: string;
  kind: 'cronError' | 'tokenFailure' | 'driftGuard' | 'stuck' | 'wip';
};

export type WorkOrder = {
  id: string;
  title: string;
  dueAtMs?: number;
  status: 'due' | 'upcoming' | 'stuck' | 'info';
  source: 'cron';
  jobId: string;
  jobName: string;
  notes?: string;
};

export type SafeButton = {
  id: string;
  label: string;
  jobId: string;
  confirmText?: string;
};
