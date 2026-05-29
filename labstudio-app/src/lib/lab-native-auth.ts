import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { dbConfigured, findOrCreateUserByContact } from '@/lib/db';
import { createLabstudioSessionToken, getSessionSecret, SESSION_COOKIE_MAX_AGE_SECONDS } from '@/lib/session';

const UID_COOKIE = 'labstudio_uid';
const SESSION_COOKIE = 'labstudio_session';
const UID_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

export type NativeLoginBody = {
  email?: string;
  phone?: string;
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
    maxAge: UID_COOKIE_MAX_AGE_SECONDS,
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
  const phone = typeof body.phone === 'string' ? body.phone : '';

  try {
    const jar = await cookies();
    const currentUserId = jar.get(UID_COOKIE)?.value ?? null;
    const { user, profile, created } = await findOrCreateUserByContact({
      email,
      phone,
      currentUserId,
    });

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
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to log in.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export function handleNativeLogout() {
  const response = NextResponse.json({ ok: true });
  clearLabAuthCookies(response);
  return response;
}
