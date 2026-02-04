'use client';

import { useEffect, useState } from 'react';
import Card from '../components/Card';

type ShopProduct = {
  slug: string;
  name: string;
  description: string | null;
  price_cents: number | null;
  checkout_url: string | null;
};

export default function MarketView() {
  const [data, setData] = useState<{ products: ShopProduct[]; entitlements: string[] } | null>(null);

  useEffect(() => {
    fetch('/api/lab/shop')
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok) setData({ products: j.products ?? [], entitlements: j.entitlements ?? [] });
      })
      .catch(() => {
        // ignore
      });
  }, []);

  return (
    <div className="space-y-4 pb-20">
      <div className="px-1">
        <h1 className="text-2xl font-black italic uppercase">Shop</h1>
        <div className="text-xs text-zinc-500 mt-1">Real products from thelabstudiogym.com (deep links to Stripe checkout).</div>
      </div>

      {!data ? (
        <Card className="p-4">
          <div className="text-sm text-zinc-300">Loading…</div>
        </Card>
      ) : data.products.length === 0 ? (
        <Card className="p-4">
          <div className="text-sm text-zinc-300">No products available yet.</div>
          <div className="text-xs text-zinc-500 mt-2">(DB-backed — once products exist, they’ll show here.)</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.products.map((p) => {
            const owned = data.entitlements.includes(p.slug);
            return (
              <Card key={p.slug} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold">{p.name}</div>
                    {p.description ? <div className="text-xs text-zinc-500 mt-1">{p.description}</div> : null}
                  </div>
                  {owned ? (
                    <div className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">Active</div>
                  ) : null}
                </div>

                {p.checkout_url ? (
                  <a
                    href={p.checkout_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-xs font-black text-zinc-950 bg-yellow-400 hover:bg-yellow-300 px-3 py-2 rounded-xl"
                  >
                    Checkout
                  </a>
                ) : (
                  <div className="text-xs text-zinc-500">Checkout link not configured.</div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
