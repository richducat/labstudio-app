import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function missingEnv(required: string[]) {
  return required.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
}

export async function GET() {
  // IMPORTANT: never return secrets, only missing variable NAMES.
  // We fail loudly in Production so broken deployments are obvious.
  const requiredProd = ['DATABASE_URL', 'LABSTUDIO_ACCESS_CODE', 'LABSTUDIO_SESSION_SECRET', 'STRIPE_SECRET_KEY'];
  const requiredAny = ['DATABASE_URL'];

  const isProd = process.env.NODE_ENV === 'production';
  const required = isProd ? requiredProd : requiredAny;
  const missing = missingEnv(required);

  if (missing.length) {
    return NextResponse.json(
      {
        ok: false,
        env_ok: false,
        node_env: process.env.NODE_ENV ?? null,
        missing,
      },
      { status: isProd ? 500 : 200 }
    );
  }

  return NextResponse.json({ ok: true, env_ok: true, node_env: process.env.NODE_ENV ?? null });
}
