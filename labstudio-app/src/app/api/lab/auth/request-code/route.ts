import { NextResponse } from 'next/server';
import { requestLoginCode } from '@/lib/verified-login';

export const runtime = 'nodejs';
export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin) {
    return NextResponse.json({ ok: false, error: 'Invalid request origin.' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  try {
    const result = await requestLoginCode(body?.email);
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false, error: 'Unable to send a code. Check your email address and try again in a minute. If this continues, contact member support.' }, { status: 400 });
  }
}
