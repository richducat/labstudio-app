'use client';

import { useEffect, useMemo, useState } from 'react';
import Card from './Card';

type SetupStep = {
  slug: string;
  title: string;
  url: string;
  required: boolean;
  completed: boolean;
};

type ShopProduct = {
  slug: string;
  name: string;
  description: string | null;
  price_cents: number | null;
  checkout_url: string | null;
};

export default function GymSetupBanner() {
  const [setup, setSetup] = useState<{ access_product_slug: string | null } | null>(null);
  const [steps, setSteps] = useState<SetupStep[] | null>(null);
  const [products, setProducts] = useState<ShopProduct[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [s, p] = await Promise.all([
      fetch('/api/lab/setup').then((r) => r.json()),
      fetch('/api/lab/shop').then((r) => r.json()),
    ]);
    if (s?.ok) {
      setSetup({ access_product_slug: s.setup?.access_product_slug ?? null });
      setSteps(s.steps ?? []);
    }
    if (p?.ok) {
      setProducts(p.products ?? []);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const requiredIncomplete = useMemo(() => {
    const stepIncomplete = (steps || []).some((s) => s.required && !s.completed);
    const accessIncomplete = !setup?.access_product_slug;
    return stepIncomplete || accessIncomplete;
  }, [steps, setup?.access_product_slug]);

  const completeStep = async (step_slug: string, complete: boolean) => {
    setBusy(true);
    try {
      await fetch('/api/lab/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: complete ? 'complete_step' : 'uncomplete_step', step_slug }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const setAccess = async (access_product_slug: string) => {
    setBusy(true);
    try {
      await fetch('/api/lab/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'set_access', access_product_slug }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (steps == null || setup == null) return null;

  // Banner stays visible until required items are done.
  if (!requiredIncomplete) return null;

  return (
    <div className="mb-4">
      <Card className="border border-yellow-500/30 bg-yellow-500/10 p-4">
        <div className="text-xs font-bold text-yellow-400 tracking-widest uppercase">Action needed</div>
        <div className="text-sm text-zinc-200 mt-1">Finish Gym Setup (waivers + choose access). Then your dashboard will be fully unlocked.</div>

        <div className="mt-4 space-y-3">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">1) Waivers</div>
          <div className="space-y-2">
            {steps.map((s) => (
              <div key={s.slug} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">
                    {s.title} {s.required ? <span className="text-yellow-400">(required)</span> : <span className="text-zinc-500">(if applicable)</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-black text-zinc-950 bg-white/80 hover:bg-white px-3 py-2 rounded-xl"
                  >
                    Open
                  </a>
                  <button
                    disabled={busy}
                    onClick={() => completeStep(s.slug, !s.completed)}
                    className={`text-xs font-black px-3 py-2 rounded-xl ${
                      s.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-400 text-zinc-950'
                    }`}
                  >
                    {s.completed ? 'Completed' : 'Mark complete'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">2) Choose your access</div>
            <div className="text-xs text-zinc-500 mt-1">Pick the pass/membership you bought (or plan to buy). This is a manual confirmation for now.</div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
              {(products || []).map((p) => {
                const selected = setup?.access_product_slug === p.slug;
                return (
                  <div key={p.slug} className={`rounded-2xl border border-white/10 p-3 ${selected ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-900/60'}`}>
                    <div className="text-sm font-bold">{p.name}</div>
                    {p.description ? <div className="text-xs text-zinc-500 mt-1">{p.description}</div> : null}
                    <div className="mt-2 flex gap-2">
                      {p.checkout_url ? (
                        <a
                          href={p.checkout_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-black text-zinc-950 bg-yellow-400 hover:bg-yellow-300 px-3 py-2 rounded-xl"
                        >
                          Checkout
                        </a>
                      ) : null}
                      <button
                        disabled={busy}
                        onClick={() => setAccess(p.slug)}
                        className={`text-xs font-black px-3 py-2 rounded-xl ${selected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white'}`}
                      >
                        {selected ? 'Selected' : 'Mark as my access'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
