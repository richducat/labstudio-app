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

async function seedDefaultProducts() {
  const q = sql();

  // Source of truth: https://thelabstudiogym.com/passes%2Fmemberships
  const defaults = [
    {
      slug: 'day-pass',
      name: '$10 Day pass (1 time access)',
      description: '1-time access. No card on file.',
      price_cents: 1000,
      checkout_url: 'https://buy.stripe.com/3cIdR9cqGeT5e3F8T373G04',
    },
    {
      slug: 'week-pass',
      name: '$35 1 Week Pass (24/7 Facility Access)',
      description: 'No card on file.',
      price_cents: 3500,
      checkout_url: 'https://buy.stripe.com/eVq6oH1M2cKX6Bdglv73G03',
    },
    {
      slug: '31-day-pass',
      name: '$70 31 Day Pass (24/7 Facility + Recovery Room Access)',
      description: 'No card on file.',
      price_cents: 7000,
      checkout_url: 'https://buy.stripe.com/cNi5kD8aq12f3p1glv73G02',
    },
    {
      slug: 'monthly-membership',
      name: '$50 Monthly Membership (Subscription)',
      description: 'Discount rate. Card on file.',
      price_cents: 5000,
      checkout_url: 'https://buy.stripe.com/cNieVd76m9yL6Bd2uF73G00',
    },
  ];

  for (const p of defaults) {
    await q`
      insert into lab_products (slug, name, description, price_cents, checkout_url, active)
      values (${p.slug}, ${p.name}, ${p.description}, ${p.price_cents}, ${p.checkout_url}, true)
      on conflict (slug) do update set
        name = excluded.name,
        description = excluded.description,
        price_cents = excluded.price_cents,
        checkout_url = excluded.checkout_url,
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

  // Seed defaults if empty
  const q = sql();
  const count = (await q`select count(*)::int as c from lab_products;`) as any[];
  if (Number(count?.[0]?.c ?? 0) === 0) {
    await seedDefaultProducts();
  }

  const products = (await q`
    select slug, name, description, price_cents, checkout_url, active
    from lab_products
    where active = true
    order by price_cents asc nulls last, slug asc;
  `) as any[];

  const entitlements = (await q`
    select product_slug
    from lab_user_entitlements
    where user_id = ${uid};
  `) as any[];

  return NextResponse.json({
    ok: true,
    products: products.map((p) => ({
      slug: p.slug,
      name: p.name,
      description: p.description,
      price_cents: p.price_cents,
      checkout_url: p.checkout_url,
    })),
    entitlements: entitlements.map((e) => e.product_slug),
  });
}
