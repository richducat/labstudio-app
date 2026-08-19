'use client';

import { useEffect, useRef, useState } from 'react';
import { Activity, Calendar, MessageSquare, Brain, ShoppingBag, User, Trophy, ChevronRight } from 'lucide-react';
import type { LabTab } from './tabs';

type Item = { tab: LabTab; label: string; icon: React.ElementType };

const LEFT: Item[] = [
  { tab: 'home', label: 'Dash', icon: Activity },
  { tab: 'book', label: 'Book', icon: Calendar },
  { tab: 'games', label: 'Games', icon: Brain },
];
const RIGHT: Item[] = [
  { tab: 'social', label: 'Rank', icon: Trophy },
  { tab: 'market', label: 'Shop', icon: ShoppingBag },
  { tab: 'profile', label: 'Me', icon: User },
];

/** Hide the bar on scroll-down, reveal on scroll-up — the Syncc minimize feel. */
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY.current;
        if (y < 40) setHidden(false);
        else if (dy > 6) setHidden(true);
        else if (dy < -6) setHidden(false);
        lastY.current = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return hidden;
}

function TabButton({ item, active, onClick }: { item: Item; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2"
    >
      {active && (
        <span className="absolute inset-x-1.5 inset-y-1 rounded-2xl bg-white/[0.07] ring-1 ring-white/10" />
      )}
      <Icon
        size={22}
        strokeWidth={active ? 2.4 : 1.9}
        className={`relative z-10 transition-colors ${active ? 'text-white' : 'text-zinc-500'}`}
      />
      <span
        className={`relative z-10 text-[10px] font-semibold tracking-tight transition-colors ${
          active ? 'text-white' : 'text-zinc-600'
        }`}
      >
        {item.label}
      </span>
    </button>
  );
}

export default function PremiumTabBar({
  tab,
  setTab,
  accessory,
}: {
  tab: LabTab;
  setTab: (t: LabTab) => void;
  accessory?: { label: string; value: string; onClick: () => void } | null;
}) {
  const hidden = useHideOnScroll();
  const coachActive = tab === 'coach';

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 flex flex-col items-center px-3 transition-transform duration-300 ease-out ${
        hidden ? 'translate-y-[130%]' : 'translate-y-0'
      }`}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
    >
      {/* Contextual accessory strip — the persistent "always-on" info line */}
      {accessory && (
        <button
          type="button"
          onClick={accessory.onClick}
          className="mb-2 flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/70 px-4 py-2.5 backdrop-blur-2xl lg:max-w-md"
        >
          <span className="min-w-0 truncate text-left">
            <span className="mr-2 text-[10px] font-semibold uppercase tracking-widest text-violet-400">
              {accessory.label}
            </span>
            <span className="text-sm text-zinc-200">{accessory.value}</span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-zinc-500" />
        </button>
      )}

      {/* Floating glass capsule */}
      <div className="relative w-full max-w-md">
        <div className="flex items-stretch rounded-[28px] border border-white/10 bg-zinc-950/80 px-1.5 shadow-[0_16px_50px_-12px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
          {LEFT.map((it) => (
            <TabButton key={it.tab} item={it} active={tab === it.tab} onClick={() => setTab(it.tab)} />
          ))}

          {/* Center Coach button — raised, premium */}
          <div className="relative flex w-16 shrink-0 justify-center">
            <button
              type="button"
              onClick={() => setTab('coach')}
              aria-label="Coach"
              aria-current={coachActive ? 'page' : undefined}
              className={`absolute -top-6 flex h-14 w-14 items-center justify-center rounded-full ring-4 ring-zinc-950 transition-all duration-300 ${
                coachActive
                  ? 'scale-105 bg-white text-violet-600'
                  : 'bg-gradient-to-b from-violet-500 to-violet-700 text-white shadow-[0_8px_24px_-4px_rgba(124,58,237,0.7)] hover:scale-105'
              }`}
            >
              <MessageSquare size={22} fill="currentColor" />
            </button>
            <span
              className={`mt-auto pb-2 text-[10px] font-semibold tracking-tight ${
                coachActive ? 'text-white' : 'text-zinc-600'
              }`}
            >
              Coach
            </span>
          </div>

          {RIGHT.map((it) => (
            <TabButton key={it.tab} item={it} active={tab === it.tab} onClick={() => setTab(it.tab)} />
          ))}
        </div>
      </div>
    </div>
  );
}
