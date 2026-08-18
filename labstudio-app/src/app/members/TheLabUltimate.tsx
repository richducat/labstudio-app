'use client';

import { useState } from 'react';
import { Activity, Calendar, MessageSquare, Brain, ShoppingBag, User, Trophy } from 'lucide-react';

import TobyCoachView from './TobyCoachView';
import HomeView from './views/HomeView';
import WorkoutView from './views/WorkoutView';
import BookView from './views/BookView';
import NutritionView from './views/NutritionView';
import HabitsView from './views/HabitsView';
import MessagesView from './views/MessagesView';
import CommunityView from './views/CommunityView';
import ChallengesView from './views/ChallengesView';
import WearablesView from './views/WearablesView';
import SocialView from './views/SocialView';
import LibraryView from './views/LibraryView';
import GamesView from './views/GamesView';
import MarketView from './views/MarketView';
import ProgressView from './views/ProgressView';
import ProfileView from './views/ProfileView';
import { type LabTab } from './tabs';

function NavBtn({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-all sm:flex-none sm:px-2 ${active ? 'text-white scale-[1.02]' : 'text-zinc-500 hover:text-zinc-300'
        }`}
    >
      <Icon size={20} strokeWidth={active ? 2.5 : 2} />
      <span className="max-w-full truncate text-[9px] font-bold tracking-wide uppercase sm:text-[10px]">{label}</span>
    </button>
  );
}

export default function TheLabUltimate({
  initialUser,
  initialProfile,
  needsOnboarding,
}: {
  initialUser: { display_name?: string; xp?: number; level?: number } | null;
  initialProfile: {
    first_name?: string | null;
    last_name?: string | null;
    goal?: string | null;
  } | null;
  needsOnboarding?: boolean;
}) {
  const [tab, setTabState] = useState<LabTab>('home');
  const [tabMeta, setTabMeta] = useState<Record<string, unknown> | null>(null);
  const xp = initialUser?.xp ?? 0;
  const level = initialUser?.level ?? 1;
  const name =
    [initialProfile?.first_name, initialProfile?.last_name].filter(Boolean).join(' ') ||
    initialUser?.display_name ||
    'Athlete';
  const goal = initialProfile?.goal ?? null;

  const setTab = (next: LabTab, meta?: Record<string, unknown>) => {
    setTabState(next);
    setTabMeta(meta ?? null);
  };

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col overflow-x-hidden bg-zinc-950 font-sans text-white selection:bg-violet-500/30"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Background wash */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[-20%] w-[70%] h-[60%] bg-violet-950/25 blur-[160px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/5 bg-zinc-950/80 px-4 py-3 backdrop-blur-xl">
        <div className="flex cursor-pointer items-center gap-3" onClick={() => setTab('home')}>
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center font-semibold">
            L
          </div>
          <div className="min-w-0">
            <div className="font-bold tracking-wider leading-none">LAB STUDIO</div>
            <div className="text-[9px] text-zinc-500 tracking-[0.2em] font-bold">MEMBER APP</div>
          </div>
        </div>

        <div className="hidden text-xs font-mono text-zinc-400 sm:block">app.labstudio.fit</div>
      </header>

      {/* Content */}
      <main className="relative z-10 mx-auto flex-1 w-full max-w-md p-4 pb-[calc(132px+env(safe-area-inset-bottom))] lg:max-w-6xl lg:pb-[calc(116px+env(safe-area-inset-bottom))]">
        {needsOnboarding ? (
          <div className="mb-4 flex flex-col items-start gap-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-bold text-yellow-400 tracking-widest uppercase">Action needed</div>
              <div className="text-sm text-zinc-200">Finish onboarding so your dashboard, coaching, and plans are personalized.</div>
            </div>
            <a
              href="/onboarding"
              className="w-full rounded-xl bg-yellow-400 px-3 py-2 text-center text-xs font-semibold text-zinc-950 hover:bg-yellow-300 sm:w-auto sm:shrink-0"
            >
              Finish onboarding
            </a>
          </div>
        ) : null}
        {tab === 'home' && (
          <HomeView
            xp={xp}
            level={level}
            credits={0}
            userProfile={{ name, goal }}
            setTab={setTab}
          />
        )}

        {tab === 'coach' && <TobyCoachView />}

        {tab === 'book' && <BookView />}
        {tab === 'games' && <GamesView setTab={setTab} />}
        {tab === 'market' && <MarketView />}
        {tab === 'profile' && <ProfileView />}

        {tab === 'workout' && <WorkoutView onSelect={() => { }} />}
        {tab === 'nutrition' && <NutritionView />}
        {tab === 'habits' && <HabitsView />}
        {tab === 'messages' && <MessagesView setTab={setTab} />}
        {tab === 'community' && <CommunityView />}
        {tab === 'challenges' && <ChallengesView setTab={setTab} />}
        {tab === 'wearables' && <WearablesView />}
        {tab === 'social' && <SocialView />}
        {tab === 'library' && <LibraryView />}
        {tab === 'progress' && (
          <ProgressView
            mode={(tabMeta?.mode as string) === 'prs' ? 'prs' : 'photos'}
            onBack={() => setTab('home')}
          />
        )}
      </main>

      {/* Nav Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-xl border-t border-white/10 z-50 pt-2 shadow-[0_-10px_40px_-10px_rgba(0,0,0,1)]"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
      >
        <div className="mx-auto grid max-w-md grid-cols-7 items-end gap-1 px-2 lg:max-w-6xl">
          <NavBtn icon={Activity} label="Dash" active={tab === 'home'} onClick={() => setTab('home')} />
          <NavBtn icon={Calendar} label="Book" active={tab === 'book'} onClick={() => setTab('book')} />
          <NavBtn icon={Brain} label="Games" active={tab === 'games'} onClick={() => setTab('games')} />

          <div className="group relative -mt-8 flex justify-center sm:-mt-10">
            <button
              type="button"
              onClick={() => setTab('coach')}
              className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-4 border-zinc-950 transition-all duration-300 sm:h-16 sm:w-16 ${tab === 'coach'
                ? 'scale-105 bg-white text-violet-600 shadow-xl sm:scale-110'
                : 'bg-violet-600 text-white group-hover:scale-105 group-hover:bg-violet-500'
                }`}
            >
              <MessageSquare size={22} fill="currentColor" className="sm:h-[26px] sm:w-[26px]" />
            </button>
          </div>

          <NavBtn icon={Trophy} label="Rank" active={tab === 'social'} onClick={() => setTab('social')} />
          <NavBtn icon={ShoppingBag} label="Shop" active={tab === 'market'} onClick={() => setTab('market')} />
          <NavBtn icon={User} label="Me" active={tab === 'profile'} onClick={() => setTab('profile')} />
        </div>
      </nav>
    </div>
  );
}
