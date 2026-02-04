'use client';

import { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';

type Profile = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  goal?: string | null;
};

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

export default function ProfileView() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [setup, setSetup] = useState<{ access_product_slug: string | null } | null>(null);
  const [steps, setSteps] = useState<SetupStep[] | null>(null);
  const [products, setProducts] = useState<ShopProduct[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [p, s, shop] = await Promise.all([
      fetch('/api/lab/profile').then((r) => r.json()),
      fetch('/api/lab/setup').then((r) => r.json()),
      fetch('/api/lab/shop').then((r) => r.json()),
    ]);

    if (p?.ok) setProfile(p.profile ?? null);
    if (s?.ok) {
      setSetup({ access_product_slug: s.setup?.access_product_slug ?? null });
      setSteps(s.steps ?? []);
    }
    if (shop?.ok) setProducts(shop.products ?? []);
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

  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Athlete';

  return (
    <div className="space-y-4 pb-20">
      <div className="px-1">
        <h1 className="text-2xl font-black italic uppercase">Profile</h1>
        <div className="text-xs text-zinc-500 mt-1">Your info + gym setup (waivers and access).</div>
      </div>

      <Card className="p-4 space-y-2">
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Personal</div>
        <div className="text-lg font-black italic">{name}</div>
        <div className="text-xs text-zinc-500">Email: {profile?.email || '—'}</div>
        <div className="text-xs text-zinc-500">Phone: {profile?.phone || '—'}</div>
        <div className="text-xs text-zinc-500">Goal: {profile?.goal || '—'}</div>
      </Card>

      {requiredIncomplete ? (
        <Card className="border border-yellow-500/30 bg-yellow-500/10 p-4 space-y-3">
          <div className="text-xs font-bold text-yellow-400 tracking-widest uppercase">Gym setup incomplete</div>
          <div className="text-sm text-zinc-200">Finish waivers + choose access to fully unlock your dashboard.</div>

          <div className="space-y-3">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Waivers</div>
            <div className="space-y-2">
              {(steps || []).map((s) => (
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

            <div className="pt-1">
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Choose your access</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                {(products || []).map((p) => {
                  const selected = setup?.access_product_slug === p.slug;
                  return (
                    <div
                      key={p.slug}
                      className={`rounded-2xl border border-white/10 p-3 ${
                        selected ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-900/60'
                      }`}
                    >
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
                          className={`text-xs font-black px-3 py-2 rounded-xl ${
                            selected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white'
                          }`}
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
      ) : (
        <Card className="border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="text-xs font-bold text-emerald-400 tracking-widest uppercase">Gym setup complete</div>
          <div className="text-sm text-zinc-200">You’re good to go.</div>
        </Card>
      )}
    </div>
  );
}
