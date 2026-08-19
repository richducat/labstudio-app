import { NextResponse } from 'next/server';
import { handleNativeLogin, type NativeLoginBody } from '@/lib/lab-native-auth';
import { allow, clientIp } from '@/lib/ip-throttle';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // Throttle login to blunt member enumeration and unlimited session/row creation.
  const ip = clientIp(req);
  if (!allow(`login:${ip}`, 10, 60_000)) {
    return NextResponse.json(
      { ok: false, error: 'Too many attempts. Try again in a minute.' },
      { status: 429 },
    );
  }
  const body = ((await req.json().catch(() => ({}))) ?? {}) as NativeLoginBody;
  return handleNativeLogin(body);
}
