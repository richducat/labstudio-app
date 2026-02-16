import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dbConfigured, ensureSchema, getOrCreateUser } from '@/lib/db';
import { neon } from '@neondatabase/serverless';

export const runtime = 'nodejs';

type Body = {
  weight?: string | number;
  bodyFat?: string | number;
  restingHr?: string | number;
  note?: string;
};

function sql() {
  const url = process.env.DATABASE_URL || '';
  if (!url) throw new Error('DATABASE_URL not configured');
  return neon(url);
}

export async function POST(req: Request) {
  if (!dbConfigured()) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL not configured' }, { status: 400 });
  }

  const jar = await cookies();
  const uid = jar.get('labstudio_uid')?.value;
  if (!uid) {
    return NextResponse.json({ ok: false, error: 'Missing labstudio_uid cookie' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;

  await ensureSchema();
  await getOrCreateUser(uid);

  const weightRaw = body.weight === '' || body.weight == null ? null : Number(body.weight);
  const bodyFatRaw = body.bodyFat === '' || body.bodyFat == null ? null : Number(body.bodyFat);
  const restingHrRaw = body.restingHr === '' || body.restingHr == null ? null : Number(body.restingHr);

  const weight = weightRaw != null && Number.isFinite(weightRaw) ? weightRaw : null;
  const bodyFat = bodyFatRaw != null && Number.isFinite(bodyFatRaw) ? bodyFatRaw : null;
  const restingHr = restingHrRaw != null && Number.isFinite(restingHrRaw) ? restingHrRaw : null;
  const note = body.note?.slice(0, 2000) ?? null;

  const q = sql();
  type InsertedRow = { id: number; created_at: string };
  const rows = (await q`
    insert into lab_daily_stats (user_id, weight_lbs, body_fat_pct, resting_hr, note)
    values (
      ${uid},
      ${weight},
      ${bodyFat},
      ${restingHr},
      ${note}
    )
    returning id, created_at;
  `) as InsertedRow[];

  return NextResponse.json({ ok: true, saved: rows?.[0] ?? null });
}
