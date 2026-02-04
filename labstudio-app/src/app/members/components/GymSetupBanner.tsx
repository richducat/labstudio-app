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

export default function GymSetupBanner({ onOpenProfile }: { onOpenProfile: () => void }) {
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
    <div className="mb-3">
      <Card className="border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-black text-yellow-400 uppercase tracking-widest leading-none">Gym setup incomplete</div>
          <div className="text-xs text-zinc-200 truncate">Finish waivers + choose access to unlock everything.</div>
        </div>
        <button
          disabled={busy}
          onClick={onOpenProfile}
          className="shrink-0 text-xs font-black text-zinc-950 bg-yellow-400 hover:bg-yellow-300 px-3 py-2 rounded-xl"
        >
          Finish setup
        </button>
      </Card>
    </div>
  );
}
