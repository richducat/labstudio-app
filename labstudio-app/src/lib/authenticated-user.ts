import { cookies } from 'next/headers';
import { dbConfigured, sql } from '@/lib/db';
import { getSessionSecret, verifyLabstudioSessionToken } from '@/lib/session';

export async function getAuthenticatedUserId(): Promise<string | undefined> {
  const jar = await cookies();
  const token = jar.get('labstudio_session')?.value;
  const secret = getSessionSecret();
  if (!token || !secret || !dbConfigured()) return undefined;
  const session = await verifyLabstudioSessionToken(token, secret);
  if (!session) return undefined;
  // Do not recreate a deleted account from an otherwise valid session.
  const q = sql();
  const users = await q`select id from lab_users where id = ${session.userId} limit 1`;
  return users.length === 1 ? session.userId : undefined;
}
