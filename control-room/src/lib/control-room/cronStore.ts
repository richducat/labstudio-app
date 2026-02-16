import fs from 'node:fs/promises';
import { getCronJobsPath } from './paths';
import type { CronStore } from './types';

export async function readCronStore(): Promise<CronStore> {
  const p = getCronJobsPath();
  const raw = await fs.readFile(p, 'utf8');
  const data = JSON.parse(raw) as CronStore;
  if (!data || !Array.isArray(data.jobs)) {
    throw new Error(`Invalid cron store at ${p}`);
  }
  return data;
}
