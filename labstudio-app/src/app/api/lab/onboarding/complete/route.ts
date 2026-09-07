import { getAuthenticatedUserId } from '@/lib/authenticated-user';
import { NextResponse } from 'next/server';
import { dbConfigured, ensureSchema, getOrCreateUser, markOnboardingComplete } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST() {
  if (!dbConfigured()) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL not configured' }, { status: 400 });
  }

  const uid = await getAuthenticatedUserId();
  if (!uid) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  await ensureSchema();
  await getOrCreateUser(uid);
  await markOnboardingComplete(uid);

  return NextResponse.json({ ok: true, onboarding_complete: true });
}
