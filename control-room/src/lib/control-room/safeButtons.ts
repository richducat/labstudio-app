import fs from 'node:fs/promises';
import path from 'node:path';
import type { SafeButton } from './types';

export async function readSafeButtons(): Promise<SafeButton[]> {
  const p = path.join(process.cwd(), 'safe-buttons.json');
  try {
    const raw = await fs.readFile(p, 'utf8');
    const data = JSON.parse(raw) as { buttons?: SafeButton[] };
    return Array.isArray(data.buttons) ? data.buttons : [];
  } catch {
    return [];
  }
}
