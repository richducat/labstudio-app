import { getAuthenticatedUserId } from '@/lib/authenticated-user';
import { NextResponse } from 'next/server';
import { dbConfigured, ensureSchema, getOrCreateUser } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  if (!dbConfigured()) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL not configured' }, { status: 400 });
  }

  const uid = await getAuthenticatedUserId();
  if (!uid) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  await ensureSchema();
  const user = await getOrCreateUser(uid);

  return NextResponse.json({ ok: true, user: { id: user.id, display_name: user.display_name, xp: user.xp, level: user.level } });
}
