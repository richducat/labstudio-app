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

function cents(n: number) {
  return Math.round(n * 100);
}

async function seedDefaultCafeItems() {
  const q = sql();

  // Source of truth: https://thelabstudiogym.com/studio-cafe/ols/products
  // (Captured on 2026-02-04)
  const items = [
    // Drinks
    { slug: 'water-bottle', name: 'Water Bottle', category: 'drinks', price_cents: cents(1.0), product_url: 'https://thelabstudiogym.com/studio-cafe/ols/products/water-bottle' },
    { slug: 'gatorade', name: 'Gatorade', category: 'drinks', price_cents: cents(3.0), product_url: 'https://thelabstudiogym.com/studio-cafe/ols/products/gatorade' },
    { slug: 'alani-energy', name: 'Alani Energy', category: 'drinks', price_cents: cents(3.75), product_url: 'https://thelabstudiogym.com/studio-cafe/ols/products/alani-energy' },
    { slug: 'celsius', name: 'Celsius', category: 'drinks', price_cents: cents(3.75), product_url: 'https://thelabstudiogym.com/studio-cafe/ols/products/bloom-energy-drink' },
    { slug: 'nurri-protein', name: 'Nurri Protein Ultra filtered Milk Based', category: 'drinks', price_cents: cents(4.5), product_url: 'https://thelabstudiogym.com/studio-cafe/ols/products/nurri-protein-ultra-filtered-milk-based' },
    { slug: 'vital-protein-rtg', name: 'Vital Protein - (Ready to Go)', category: 'drinks', price_cents: cents(5.0), product_url: 'https://thelabstudiogym.com/studio-cafe/ols/products/ready-to-go-protein-shake' },

    // Snacks
    { slug: 'rush-small-bag', name: 'Rush Small Bag (2 servings)', category: 'snacks', price_cents: cents(6.0), product_url: 'https://thelabstudiogym.com/studio-cafe/ols/products/rush-small-bag-2-servings' },
    { slug: 'strawberry-parfait-ml', name: 'Strawberry (M/L) Parfait', category: 'snacks', price_cents: cents(9.0), product_url: 'https://thelabstudiogym.com/studio-cafe/ols/products/strawberry-medium-parfait' },
    { slug: 'rush-preworkout-big-bag', name: 'Rush Pre workout Big Bag (10 packs)', category: 'snacks', price_cents: cents(50.0), product_url: 'https://thelabstudiogym.com/studio-cafe/ols/products/rush-pre-workout-big-bag-10-packs' },

    // Meals
    { slug: 'meal-chicken-white-rice-broccoli', name: 'Medium Chicken, White Rice, Broccolli', category: 'meals', price_cents: cents(11.5), product_url: 'https://thelabstudiogym.com/studio-cafe/ols/products/medium-chicken-white-rice-broccolli' },
    { slug: 'meal-chicken-quesadilla', name: 'Chicken Quesadilla', category: 'meals', price_cents: cents(12.5), product_url: 'https://thelabstudiogym.com/studio-cafe/ols/products/chicken-quesadilla' },
    { slug: 'meal-chicken-sweet-potato-broccoli', name: 'Medium Chicken, Sweet Potato, and Broccoli', category: 'meals', price_cents: cents(13.5), product_url: 'https://thelabstudiogym.com/studio-cafe/ols/products/medium-chicken-sweet-potato-and-broccoli' },
    { slug: 'meal-steak-white-rice-green-beans', name: 'Medium Steak, White Rice, and Green Beans', category: 'meals', price_cents: cents(15.0), product_url: 'https://thelabstudiogym.com/studio-cafe/ols/products/medium-steak-white-rice-and-green-beans' },
  ];

  for (const it of items) {
    await q`
      insert into lab_cafe_items (slug, name, category, price_cents, product_url, active)
      values (${it.slug}, ${it.name}, ${it.category}, ${it.price_cents}, ${it.product_url}, true)
      on conflict (slug) do update set
        name = excluded.name,
        category = excluded.category,
        price_cents = excluded.price_cents,
        product_url = excluded.product_url,
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
  const count = (await q`select count(*)::int as c from lab_cafe_items;`) as any[];
  if (Number(count?.[0]?.c ?? 0) === 0) {
    await seedDefaultCafeItems();
  }

  const items = (await q`
    select slug, name, category, price_cents, product_url
    from lab_cafe_items
    where active = true
    order by category asc, price_cents asc, name asc;
  `) as any[];

  return NextResponse.json({
    ok: true,
    items: items.map((i) => ({
      slug: i.slug,
      name: i.name,
      category: i.category,
      price_cents: i.price_cents,
      product_url: i.product_url,
    })),
  });
}
