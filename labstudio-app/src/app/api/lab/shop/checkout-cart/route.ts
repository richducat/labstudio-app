import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { dbConfigured, ensureSchema, getOrCreateUser } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

type CartLine = {
  price_id: string;
  quantity: number;
};

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

  const body = (await req.json().catch(() => ({}))) as { lines?: unknown };
  const linesRaw = Array.isArray((body as any)?.lines) ? ((body as any).lines as any[]) : [];
  const lines: CartLine[] = linesRaw
    .map((l) => ({ price_id: String(l?.price_id || '').trim(), quantity: Number(l?.quantity || 0) }))
    .filter((l) => l.price_id && Number.isFinite(l.quantity) && l.quantity > 0)
    .map((l) => ({ ...l, quantity: Math.min(99, Math.floor(l.quantity)) }));

  if (lines.length === 0) {
    return NextResponse.json({ ok: false, error: 'Cart is empty' }, { status: 400 });
  }

  const stripe = getStripe();

  // Decide mode: if any line is recurring, require subscription mode.
  // (Stripe Checkout can’t mix subscription + one-time in one session.)
  const prices = await Promise.all(lines.map((l) => stripe.prices.retrieve(l.price_id)));
  const hasRecurring = prices.some((p) => p.type === 'recurring');
  const hasOneTime = prices.some((p) => p.type !== 'recurring');

  if (hasRecurring && hasOneTime) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Cart cannot mix subscriptions and one-time items yet. Please checkout memberships separately from cafe items.',
      },
      { status: 400 }
    );
  }

  const mode: 'subscription' | 'payment' = hasRecurring ? 'subscription' : 'payment';

  const h = await headers();
  const origin = h.get('origin') || 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: lines.map((l) => ({ price: l.price_id, quantity: l.quantity })),
    allow_promotion_codes: true,
    success_url: `${origin}/members?checkout=success`,
    cancel_url: `${origin}/members?checkout=cancel`,
    metadata: {
      labstudio_uid: uid,
    },
  });

  return NextResponse.json({ ok: true, url: session.url });
}
