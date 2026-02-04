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

async function seedDefaultWaivers() {
  const q = sql();

  const defaults = [
    {
      slug: 'liability-release',
      title: 'Liability Release (New Member / Guest)',
      description: 'Required for new members and guests before facility access.',
      url: 'https://app.waiverelectronic.com/render/templateByRefId/6854a28c4a7a57c80f02eda5',
      applies_to: 'all',
    },
    {
      slug: 'sauna-ice-plunge',
      title: 'Sauna + Ice Plunge Waiver (Monthly Members Only)',
      description: 'Required for recovery room access (monthly membership).',
      url: 'https://app.waiverelectronic.com/render/templateByRefId/68740df405f61ad0e0932532',
      applies_to: 'monthly_members',
    },
    {
      slug: 'pt-training-agreement',
      title: 'PT Waiver + Training Agreement (Elite 1-on-1)',
      description: 'Required before starting Elite 1-on-1 Training.',
      url: 'https://app.waiverelectronic.com/render/templateByRefId/68af9be90dcc71585e8682fb',
      applies_to: 'elite_training',
    },
  ];

  for (const w of defaults) {
    await q`
      insert into lab_waivers (slug, title, description, url, applies_to, active)
      values (${w.slug}, ${w.title}, ${w.description}, ${w.url}, ${w.applies_to}, true)
      on conflict (slug) do update set
        title = excluded.title,
        description = excluded.description,
        url = excluded.url,
        applies_to = excluded.applies_to,
        active = excluded.active;
    `;
  }
}

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
  const count = (await q`select count(*)::int as c from lab_waivers;`) as any[];
  if (Number(count?.[0]?.c ?? 0) === 0) {
    await seedDefaultWaivers();
  }

  const waivers = (await q`
    select slug, title, description, url, applies_to
    from lab_waivers
    where active = true
    order by slug asc;
  `) as any[];

  return NextResponse.json({
    ok: true,
    waivers: waivers.map((w) => ({
      slug: w.slug,
      title: w.title,
      description: w.description,
      url: w.url,
      applies_to: w.applies_to,
    })),
  });
}
