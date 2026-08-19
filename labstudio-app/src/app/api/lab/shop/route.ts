import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dbConfigured, ensureSchema, getOrCreateUser } from '@/lib/db';
import { handleNativeLogin, handleNativeLogout, type NativeLoginBody } from '@/lib/lab-native-auth';
import { LAB_LOCATION, LAB_SERVICES, LAB_TIME_GROUPS } from '@/lib/lab-services';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

type ShopProduct = {
  slug: string;
  name: string;
  description: string | null;
  price_cents: number | null;
  image_url: string | null;
  stripe_price_id: string | null;
  checkout_url: string | null;
};

type ShopCatalogSeed = ShopProduct & {
  match_terms: string[];
};

const DEFAULT_SHOP_PRODUCTS: ShopCatalogSeed[] = [
  {
    slug: 'day-pass-10',
    name: 'Day Pass',
    description: '1-time access. No card on file required.',
    price_cents: 1000,
    image_url: null,
    stripe_price_id: null,
    checkout_url: 'https://buy.stripe.com/3cIdR9cqGeT5e3F8T373G04',
    match_terms: ['day pass'],
  },
  {
    slug: 'week-pass-35',
    name: '1 Week Pass',
    description: '24/7 facility access for one week. No card on file required.',
    price_cents: 3500,
    image_url: null,
    stripe_price_id: null,
    checkout_url: 'https://buy.stripe.com/eVq6oH1M2cKX6Bdglv73G03',
    match_terms: ['1 week pass', 'week pass'],
  },
  {
    slug: 'pass-31-day-70',
    name: '31 Day Pass',
    description: '24/7 facility access plus recovery room access for 31 days.',
    price_cents: 7000,
    image_url: null,
    stripe_price_id: null,
    checkout_url: 'https://buy.stripe.com/cNi5kD8aq12f3p1glv73G02',
    match_terms: ['31 day pass', 'month pass'],
  },
  {
    slug: 'monthly-membership-50',
    name: 'Monthly Membership',
    description: 'Recurring membership at the discounted rate with card on file.',
    price_cents: 5000,
    image_url: null,
    stripe_price_id: null,
    checkout_url: 'https://buy.stripe.com/cNieVd76m9yL6Bd2uF73G00',
    match_terms: ['monthly membership', 'membership subscription'],
  },
];

let cache: { at: number; products: ShopProduct[] } | null = null;

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findMatchingLiveProduct(seed: ShopCatalogSeed, products: ShopProduct[]) {
  const bySlug = products.find((product) => product.slug === seed.slug);
  if (bySlug) return bySlug;

  const candidates = products.filter((product) => {
    const normalizedName = normalizeText(product.name);
    return seed.match_terms.some((term) => normalizedName.includes(normalizeText(term)));
  });

  const byPrice = candidates.find((product) => product.price_cents === seed.price_cents);
  return byPrice ?? candidates[0] ?? null;
}

function buildCatalogProducts(liveProducts: ShopProduct[]) {
  return DEFAULT_SHOP_PRODUCTS.map((seed) => {
    const live = findMatchingLiveProduct(seed, liveProducts);
    return {
      slug: seed.slug,
      name: seed.name,
      description: seed.description,
      price_cents: live?.price_cents ?? seed.price_cents,
      image_url: live?.image_url ?? seed.image_url,
      stripe_price_id: live?.stripe_price_id ?? null,
      checkout_url: seed.checkout_url,
    } satisfies ShopProduct;
  });
}

async function listStripeProducts() {
  const now = Date.now();
  if (cache && now - cache.at < 5 * 60 * 1000) return cache.products;

  const stripe = getStripe();

  const [products, prices] = await Promise.all([
    stripe.products.list({ active: true, limit: 100 }),
    stripe.prices.list({ active: true, limit: 100 }),
  ]);

  const pricesByProduct = new Map<string, typeof prices.data>();
  for (const pr of prices.data) {
    const pid = typeof pr.product === 'string' ? pr.product : pr.product?.id;
    if (!pid) continue;
    const arr = pricesByProduct.get(pid) || [];
    arr.push(pr);
    pricesByProduct.set(pid, arr);
  }

  const out: ShopProduct[] = [];

  for (const p of products.data) {
    const slug = String(p.metadata?.slug || p.id);

    const pr = (pricesByProduct.get(p.id) || [])
      .filter((x) => x.unit_amount != null)
      .sort((a, b) => Number(a.unit_amount ?? 0) - Number(b.unit_amount ?? 0));

    const price = pr[0] ?? null;

    out.push({
      slug,
      name: p.name,
      description: p.description ?? null,
      price_cents: price?.unit_amount ?? null,
      image_url: p.images?.[0] ?? null,
      stripe_price_id: price?.id ?? null,
      checkout_url: null,
    });
  }

  out.sort((a, b) => Number(a.price_cents ?? 0) - Number(b.price_cents ?? 0));
  const catalog = buildCatalogProducts(out);
  cache = { at: now, products: catalog };
  return catalog;
}

function shopResponse(products: ShopProduct[]) {
  return NextResponse.json({
    ok: true,
    products,
    cart_enabled: Boolean(process.env.STRIPE_SECRET_KEY),
    entitlements: [],
    location: LAB_LOCATION,
    services: LAB_SERVICES,
    timeGroups: LAB_TIME_GROUPS,
  });
}

export async function GET() {
  // IMPORTANT: Shop browse should not require auth cookies.
  // We only use cookies when present (future: entitlements, user-specific pricing).
  const jar = await cookies();
  const uid = jar.get('labstudio_uid')?.value || null;

  if (uid && dbConfigured()) {
    try {
      await ensureSchema();
      await getOrCreateUser(uid);
    } catch {
      // Catalog browse should stay available even if the DB is unavailable.
    }
  }

  // If Stripe is configured, use it as the source of truth.
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const products = await listStripeProducts();
      return shopResponse(products);
    } catch {
      // Fall back to the curated catalog below.
    }
  }

  return shopResponse(buildCatalogProducts([]));
}

export async function POST(req: Request) {
  const body = ((await req.json().catch(() => ({}))) ?? {}) as NativeLoginBody & { action?: string };

  if (body.action === 'login') {
    return handleNativeLogin(body);
  }

  if (body.action === 'logout') {
    return handleNativeLogout();
  }

  return NextResponse.json({ ok: false, error: 'Unsupported shop action.' }, { status: 400 });
}
