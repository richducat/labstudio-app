import { NextResponse } from 'next/server';
import { dbConfigured } from '@/lib/db';
import { completeVerifiedLogin } from '@/lib/verified-login';
import { createLabstudioSessionToken, getSessionSecret, SESSION_COOKIE_MAX_AGE_SECONDS } from '@/lib/session';

const UID_COOKIE = 'labstudio_uid';
const SESSION_COOKIE = 'labstudio_session';

export type NativeLoginBody = {
  email?: string;
  challengeId?: string;
  code?: string;
};

function isSecureCookie() {
  return process.env.NODE_ENV === 'production';
}

function setAuthCookies(response: NextResponse, userId: string, sessionToken: string) {
  const secure = isSecureCookie();

  response.cookies.set({
    name: SESSION_COOKIE,
    value: sessionToken,
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });

  response.cookies.set({
    name: UID_COOKIE,
    value: userId,
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearLabAuthCookies(response: NextResponse) {
  const secure = isSecureCookie();

  response.cookies.set({ name: UID_COOKIE, value: '', httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 0 });
  response.cookies.set({ name: SESSION_COOKIE, value: '', httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 0 });
}

export async function handleNativeLogin(body: NativeLoginBody) {
  if (!dbConfigured()) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL not configured' }, { status: 400 });
  }

  const sessionSecret = getSessionSecret();
  if (!sessionSecret) {
    return NextResponse.json({ ok: false, error: 'Session secret is not configured' }, { status: 500 });
  }

  const email = typeof body.email === 'string' ? body.email : '';
  try {
    const { user, profile, created } = await completeVerifiedLogin(email, body.challengeId, body.code);

    const sessionToken = await createLabstudioSessionToken(user.id, sessionSecret);
    const response = NextResponse.json({
      ok: true,
      created,
      user: {
        id: user.id,
        display_name: user.display_name,
        xp: user.xp,
        level: user.level,
        onboarding_complete: user.onboarding_complete,
      },
      profile,
    });

    setAuthCookies(response, user.id, sessionToken);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    const message = 'Sign-in could not be verified. Check your code or request a new one. If this continues, contact member support.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export function handleNativeLogout() {
  const response = NextResponse.json({ ok: true });
  clearLabAuthCookies(response);
  return response;
}
