import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dbConfigured, ensureSchema, getOrCreateUser } from '@/lib/db';
import { neon } from '@neondatabase/serverless';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

function sql() {
  const url = process.env.DATABASE_URL || '';
  if (!url) throw new Error('DATABASE_URL not configured');
  return neon(url);
}

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': 'labstudio-app/1.0',
        accept: 'text/html,*/*',
      },
      // Cache aggressively to avoid per-request page scrapes (major lag source).
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Try og:image first
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    if (og?.[1]) return og[1];

    // Fallback: twitter:image
    const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    if (tw?.[1]) return tw[1];

    return null;
  } catch {
    return null;
  }
}

let stripeProductCache: { at: number; products: Awaited<ReturnType<ReturnType<typeof getStripe>['products']['list']>>['data'] } | null = null;

async function getStripeProductsCached() {
  if (!process.env.STRIPE_SECRET_KEY) return [];
  const now = Date.now();
  if (stripeProductCache && now - stripeProductCache.at < 5 * 60 * 1000) {
    return stripeProductCache.products;
  }
  const stripe = getStripe();
  const products = await stripe.products.list({ active: true, limit: 100 });
  stripeProductCache = { at: now, products: products.data };
  return products.data;
}

async function buildStripeImageMap(): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  const products = await getStripeProductsCached();

  for (const p of products) {
    const img = p.images?.[0];
    if (!img) continue;

    const slug = String(p.metadata?.slug || '').trim();
    if (slug) m.set(slug, img);

    // Also map by id and name for loose matching
    m.set(p.id, img);
    m.set(p.name.toLowerCase(), img);
  }

  return m;
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
    { slug: 'water-bottle', name: 'Water Bottle', category: 'drinks', price_cents: cents(1.0), product_url: 'https://thelabstudiogym.com/studio-cafe/ols/products/water-bottle', image_url: 'https://img1.wsimg.com/isteam/ip/4a2b6a1b-7fad-4799-8bae-97bcaf5fdd7b/ols/67b33600-7e1f-426b-96e5-1c0922b28185.50e1a4fe.webp/:/rs=w:1200,h:1200' },
    { slug: 'gatorade', name: 'Gatorade', category: 'drinks', price_cents: cents(3.0), product_url: 'https://thelabstudiogym.com/studio-cafe/ols/products/gatorade', image_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/G_lemon_Lime_1.jpg' },
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
      insert into lab_cafe_items (slug, name, category, price_cents, product_url, image_url, active)
      values (${it.slug}, ${it.name}, ${it.category}, ${it.price_cents}, ${it.product_url}, ${it.image_url ?? null}, true)
      on conflict (slug) do update set
        name = excluded.name,
        category = excluded.category,
        price_cents = excluded.price_cents,
        product_url = excluded.product_url,
        image_url = excluded.image_url,
        active = excluded.active;
    `;
  }
}

export async function GET() {
  if (!dbConfigured()) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL not configured' }, { status: 400 });
  }

  // IMPORTANT: Cafe browse should not depend on uid cookie.
  // If uid exists, we keep user creation for future per-user behavior.
  const jar = await cookies();
  const uid = jar.get('labstudio_uid')?.value || null;

  await ensureSchema();
  if (uid) {
    await getOrCreateUser(uid);
  }

  const q = sql();
  const count = (await q`select count(*)::int as c from lab_cafe_items;`) as any[];
  if (Number(count?.[0]?.c ?? 0) === 0) {
    await seedDefaultCafeItems();
  }

  const items = (await q`
    select slug, name, category, price_cents, product_url, image_url, stripe_product_id, stripe_price_id
    from lab_cafe_items
    where active = true
    order by category asc, price_cents asc, name asc;
  `) as any[];

  // Hydrate missing images + Stripe price ids (cached + persisted):
  // - Image: prefer Stripe image (metadata.slug match), else OG image.
  // - Checkout: resolve stripe_price_id for one-time purchases.
  const stripeImages = await buildStripeImageMap();
  const stripeProducts = await getStripeProductsCached();

  const hydrated = await Promise.all(
    items.map(async (i) => {
      let imageUrl: string | null = i.image_url ?? null;
      let stripeProductId: string | null = i.stripe_product_id ?? null;
      let stripePriceId: string | null = i.stripe_price_id ?? null;

      if (!imageUrl) {
        const bySlug = stripeImages.get(String(i.slug || '').trim());
        const byName = stripeImages.get(String(i.name || '').toLowerCase());
        imageUrl = bySlug || byName || null;
      }

      if (!imageUrl && i.product_url) {
        imageUrl = await fetchOgImage(String(i.product_url));
      }

      // Resolve Stripe product/price for cafe items (one-time only)
      if (process.env.STRIPE_SECRET_KEY && !stripePriceId) {
        const slug = String(i.slug || '').trim();
        const name = String(i.name || '').toLowerCase();

        const found =
          stripeProducts.find((p) => String(p.metadata?.slug || '').trim() === slug) ||
          stripeProducts.find((p) => p.name.toLowerCase() === name) ||
          null;

        if (found) {
          stripeProductId = found.id;
          try {
            const stripe = getStripe();
            const prices = await stripe.prices.list({ product: found.id, active: true, limit: 10 });
            const oneTime = prices.data
              .filter((pr) => pr.type === 'one_time' && pr.unit_amount != null)
              .sort((a, b) => Number(a.unit_amount ?? 0) - Number(b.unit_amount ?? 0));
            stripePriceId = oneTime[0]?.id ?? null;
          } catch {
            // ignore
          }
        }
      }

      if (
        (imageUrl && imageUrl !== i.image_url) ||
        (stripeProductId && stripeProductId !== i.stripe_product_id) ||
        (stripePriceId && stripePriceId !== i.stripe_price_id)
      ) {
        await q`
          update lab_cafe_items
          set image_url = coalesce(${imageUrl}, image_url),
              stripe_product_id = coalesce(${stripeProductId}, stripe_product_id),
              stripe_price_id = coalesce(${stripePriceId}, stripe_price_id)
          where slug = ${i.slug};
        `;
      }

      return {
        slug: i.slug,
        name: i.name,
        category: i.category,
        price_cents: i.price_cents,
        product_url: i.product_url,
        image_url: imageUrl,
        stripe_price_id: stripePriceId,
      };
    })
  );

  return NextResponse.json({
    ok: true,
    items: hydrated,
  });
}
