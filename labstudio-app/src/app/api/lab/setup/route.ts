import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dbConfigured, ensureSchema, getOrCreateUser } from '@/lib/db';
import { neon } from '@neondatabase/serverless';

export const runtime = 'nodejs';

function sql() {
  const url = process.env.DATABASE_URL || '';
  if (!url) throw new Error('DATABASE_URL not configured');
  return neon(url);
}

const SETUP_STEPS = [
  {
    slug: 'waiver-liability-release',
    title: 'Complete Liability Release (New Member / Guest)',
    url: 'https://app.waiverelectronic.com/render/templateByRefId/6854a28c4a7a57c80f02eda5',
    required: true,
  },
  {
    slug: 'waiver-sauna-ice-plunge',
    title: 'Complete Sauna + Ice Plunge Waiver (Monthly Members)',
    url: 'https://app.waiverelectronic.com/render/templateByRefId/68740df405f61ad0e0932532',
    required: false,
  },
  {
    slug: 'waiver-pt-training',
    title: 'Complete PT Waiver + Training Agreement (Elite 1-on-1)',
    url: 'https://app.waiverelectronic.com/render/templateByRefId/68af9be90dcc71585e8682fb',
    required: false,
  },
] as const;

export async function GET() {
  if (!dbConfigured()) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL not configured' }, { status: 400 });
  }

  const jar = await cookies();
  const uid = jar.get('labstudio_uid')?.value;
  if (!uid) {
    return NextResponse.json({ ok: false, error: 'Missing labstudio_uid cookie' }, { status: 401 });
  }

  await ensureSchema();
  await getOrCreateUser(uid);

  const q = sql();

  const setupRows = (await q`select user_id, access_product_slug from lab_user_setup where user_id = ${uid} limit 1;`) as any[];
  const setup = setupRows?.[0] ?? { user_id: uid, access_product_slug: null };

  const stepRows = (await q`
    select step_slug, completed_at
    from lab_user_setup_steps
    where user_id = ${uid};
  `) as any[];

  const completed = new Map(stepRows.map((r) => [String(r.step_slug), r.completed_at]));

  const steps = SETUP_STEPS.map((s) => ({
    ...s,
    completed: Boolean(completed.get(s.slug)),
    completed_at: completed.get(s.slug) ?? null,
  }));

  return NextResponse.json({ ok: true, setup, steps });
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

  await ensureSchema();
  await getOrCreateUser(uid);

  const body = (await req.json().catch(() => ({}))) as any;
  const action = String(body.action || '').trim();

  const q = sql();

  if (action === 'set_access') {
    const access_product_slug = typeof body.access_product_slug === 'string' ? body.access_product_slug : null;
    await q`
      insert into lab_user_setup (user_id, access_product_slug, created_at, updated_at)
      values (${uid}, ${access_product_slug}, now(), now())
      on conflict (user_id) do update set
        access_product_slug = excluded.access_product_slug,
        updated_at = now();
    `;
    return NextResponse.json({ ok: true });
  }

  if (action === 'complete_step' || action === 'uncomplete_step') {
    const step_slug = String(body.step_slug || '').trim();
    if (!step_slug) return NextResponse.json({ ok: false, error: 'Missing step_slug' }, { status: 400 });

    const completed_at = action === 'complete_step' ? new Date().toISOString() : null;

    await q`
      insert into lab_user_setup_steps (user_id, step_slug, completed_at)
      values (${uid}, ${step_slug}, ${completed_at})
      on conflict (user_id, step_slug) do update set
        completed_at = excluded.completed_at;
    `;

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
