import { NextResponse } from 'next/server';

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

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
