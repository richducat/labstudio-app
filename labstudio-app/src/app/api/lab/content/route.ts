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

async function seedAmenities() {
  const q = sql();
  const slug = 'amenities-perks';

  const title = 'Member Amenities & Perks';
  const source_url = 'https://thelabstudiogym.com/member-amenities-%26-perks';

  const body_md = [
    '## Recovery Room Amenities',
    '',
    '(Source: thelabstudiogym.com — mirrored in-app)',
    '',
    '## Additional Member Perks',
    '',
    '- Spa towels available to members only. Cleaned/bleached and folded weekly. Fresh towels are to be used for gym floor and sauna usage (mandatory to ensure sauna quality stays perfect).',
    '- Alkaline water: members get access to Sprout\'s highly filtered alkaline water (tap water also available).',
    '- State-of-the-art facility designed for 24/7 training: fully equipped gym, HIIT zone, elite cardio equipment, amenities and perks.',
  ].join('\n');

  await q`
    insert into lab_content_pages (slug, title, body_md, source_url, active, updated_at)
    values (${slug}, ${title}, ${body_md}, ${source_url}, true, now())
    on conflict (slug) do update set
      title = excluded.title,
      body_md = excluded.body_md,
      source_url = excluded.source_url,
      active = excluded.active,
      updated_at = now();
  `;
}

export async function GET(req: Request) {
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

  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get('slug') || '').trim();
  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Missing slug' }, { status: 400 });
  }

  const q = sql();

  // Seed known pages if missing.
  if (slug === 'amenities-perks') {
    const count = (await q`select count(*)::int as c from lab_content_pages where slug = ${slug};`) as any[];
    if (Number(count?.[0]?.c ?? 0) === 0) {
      await seedAmenities();
    }
  }

  const rows = (await q`
    select slug, title, body_md, source_url, updated_at
    from lab_content_pages
    where slug = ${slug} and active = true
    limit 1;
  `) as any[];

  const page = rows?.[0];
  if (!page) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    page: {
      slug: page.slug,
      title: page.title,
      body_md: page.body_md,
      source_url: page.source_url,
      updated_at: page.updated_at,
    },
  });
}
