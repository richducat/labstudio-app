'use client';

import { useEffect, useState } from 'react';

import PremiumTabBar from './PremiumTabBar';
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

  const [nextSession, setNextSession] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetch('/api/lab/home')
      .then((r) => r.json())
      .then((j) => {
        if (!active) return;
        const b = j?.nextBooking;
        if (b?.title) {
          const when = b.day ? new Date(b.day).toLocaleDateString(undefined, { weekday: 'short' }) : '';
          setNextSession(`${b.title}${b.time ? ` · ${when} ${b.time}` : ''}`);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const accessory =
    tab === 'coach'
      ? null
      : nextSession
        ? { label: 'Next', value: nextSession, onClick: () => setTab('book') }
        : { label: 'Coach', value: 'Ask Toby anything', onClick: () => setTab('coach') };

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

      <PremiumTabBar tab={tab} setTab={setTab} accessory={accessory} />
    </div>
  );
}
