import { handleNativeLogin, type NativeLoginBody } from '@/lib/lab-native-auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as NativeLoginBody;
  return handleNativeLogin(body);
}
