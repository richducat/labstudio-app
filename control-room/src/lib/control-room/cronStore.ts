import fs from 'node:fs/promises';
import { getCronJobsPath } from './paths';
import type { CronStore } from './types';

export async function readCronStore(): Promise<CronStore> {
  const p = getCronJobsPath();
  try {
    const raw = await fs.readFile(p, 'utf8');
    const data = JSON.parse(raw) as CronStore;
    if (!data || !Array.isArray(data.jobs)) return { jobs: [] };
    return data;
  } catch {
    // In hosted environments (e.g., Vercel) the local OpenClaw state dir won't exist.
    // The UI should degrade gracefully instead of hard-crashing.
    return { jobs: [] };
  }
}
