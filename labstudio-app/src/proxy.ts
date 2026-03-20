import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionSecret, verifyLabstudioSessionToken } from '@/lib/session';

const UID_COOKIE = 'labstudio_uid';
const SESSION_COOKIE = 'labstudio_session';
const UID_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

function isSecureRequest(req: NextRequest) {
  return req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';
}

function setUidCookie(res: NextResponse, req: NextRequest, value: string) {
  res.cookies.set({
    name: UID_COOKIE,
    value,
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureRequest(req),
    path: '/',
    maxAge: UID_COOKIE_MAX_AGE_SECONDS,
  });
}

function clearAuthCookies(res: NextResponse, req: NextRequest) {
  const secure = isSecureRequest(req);
  res.cookies.set({ name: UID_COOKIE, value: '', httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 0 });
  res.cookies.set({ name: SESSION_COOKIE, value: '', httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 0 });
}

function isPublicApiPath(pathname: string) {
  return pathname === '/api/lab/shop' || pathname === '/api/lab/cafe';
}

function unauthorized(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const res = NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    clearAuthCookies(res, req);
    return res;
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  const nextPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  url.searchParams.set('next', nextPath);

  const res = NextResponse.redirect(url);
  clearAuthCookies(res, req);
  return res;
}

export async function proxy(req: NextRequest) {
  if (isPublicApiPath(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return unauthorized(req);
  }

  const secret = getSessionSecret();
  if (!secret) {
    return unauthorized(req);
  }

  const session = await verifyLabstudioSessionToken(sessionToken, secret);
  if (!session?.userId) {
    return unauthorized(req);
  }

  const uid = req.cookies.get(UID_COOKIE)?.value;
  if (uid === session.userId) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  setUidCookie(res, req, session.userId);
  return res;
}

export const config = {
  matcher: ['/members/:path*', '/onboarding/:path*', '/api/lab/:path*', '/api/toby/chat'],
};
