import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/authenticated-user';
import { dbConfigured, deleteUserAccount } from '@/lib/db';

export const runtime = 'nodejs';

const UID_COOKIE = 'labstudio_uid';
const SESSION_COOKIE = 'labstudio_session';

function clearAuthCookies(response: NextResponse) {
  for (const name of [UID_COOKIE, SESSION_COOKIE]) {
    response.cookies.set({
      name,
      value: '',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
  }
}

export async function DELETE() {
  const uid = await getAuthenticatedUserId();

  if (!uid) {
    const response = NextResponse.json({ ok: true, deleted: false });
    clearAuthCookies(response);
    return response;
  }

  if (!dbConfigured()) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL not configured' }, { status: 400 });
  }

  await deleteUserAccount(uid);

  const response = NextResponse.json({ ok: true, deleted: true });
  clearAuthCookies(response);
  return response;
}
