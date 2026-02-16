import os from 'node:os';
import path from 'node:path';

export function getOpenClawStateDir() {
  return process.env.OPENCLAW_STATE_DIR || path.join(os.homedir(), '.openclaw');
}

export function getCronJobsPath() {
  return path.join(getOpenClawStateDir(), 'cron', 'jobs.json');
}

export function getCronRunsDir() {
  return path.join(getOpenClawStateDir(), 'cron', 'runs');
}
