'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Brain, Camera, ChevronRight, Gamepad2, Target, Trophy } from 'lucide-react';
import Card from '../components/Card';
import { type LabTab } from '../tabs';

type HomeData = {
  agenda?: Array<{ id: string; completed: boolean; title: string }>;
  progress?: {
    workouts7d?: { count: number; minutes: number } | null;
    photos30d?: number;
  } | null;
};

type HighScoreRow = {
  game_id: string;
  top_score: number | string;
};

type ChallengeCard = {
  id: string;
  title: string;
  desc: string;
  progress: number;
  target: number;
  helper: string;
  ctaLabel: string;
  ctaTab: LabTab;
  icon: ReactNode;
};

export default function ChallengesView({ setTab }: { setTab?: (tab: LabTab) => void }) {
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [highScores, setHighScores] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/lab/home').then(async (response) => ({
        response,
        data: (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; home?: HomeData | null },
      })),
      fetch('/api/lab/games/score').then(async (response) => ({
        response,
        data: (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; highScores?: HighScoreRow[] },
      })),
    ])
      .then(([homeResult, scoresResult]) => {
        if (!homeResult.response.ok || !homeResult.data.ok) {
          throw new Error(homeResult.data.error || `Failed to load home data (${homeResult.response.status})`);
        }
        if (!scoresResult.response.ok || !scoresResult.data.ok) {
          throw new Error(scoresResult.data.error || `Failed to load scores (${scoresResult.response.status})`);
        }

        const nextScores: Record<string, number> = {};
        for (const row of scoresResult.data.highScores ?? []) {
          nextScores[row.game_id] = Number(row.top_score) || 0;
        }

        setHomeData(homeResult.data.home ?? null);
        setHighScores(nextScores);
        setError(null);
      })
      .catch((loadError) => {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load challenges';
        setError(message);
      });
  }, []);

  const checkinsCompleted = useMemo(() => {
    const agenda = homeData?.agenda ?? [];
    return agenda.filter((item) => item.id.startsWith('auto:') && item.completed).length;
  }, [homeData?.agenda]);

  const totalBestScore = useMemo(
    () => Object.values(highScores).reduce((sum, score) => sum + score, 0),
    [highScores]
  );

  const gamesWithScores = useMemo(
    () => Object.values(highScores).filter((score) => score > 0).length,
    [highScores]
  );

  const activeChallenges = useMemo<ChallengeCard[]>(() => {
    const workouts7d = homeData?.progress?.workouts7d?.count ?? 0;
    const workoutMinutes7d = homeData?.progress?.workouts7d?.minutes ?? 0;
    const photos30d = homeData?.progress?.photos30d ?? 0;

    return [
      {
        id: 'weekly-consistency',
        title: 'WEEKLY CONSISTENCY',
        desc: 'Complete 3 workouts in a rolling 7-day window.',
        progress: workouts7d,
        target: 3,
        helper: `${workoutMinutes7d} minutes logged in the last 7 days.`,
        ctaLabel: 'Open workouts',
        ctaTab: 'workout',
        icon: <Target className="text-rose-500" size={24} />,
      },
      {
        id: 'daily-discipline',
        title: 'DAILY CHECK-IN',
        desc: 'Complete your daily check-ins for stats, nutrition, and progress photos.',
        progress: checkinsCompleted,
        target: 3,
        helper: `${checkinsCompleted} of 3 daily check-ins completed today.`,
        ctaLabel: 'Open dashboard',
        ctaTab: 'home',
        icon: <Camera className="text-cyan-400" size={24} />,
      },
      {
        id: 'arcade-volume',
        title: 'GAME SCORE',
        desc: 'Reach a combined 5,000 points across your best score in each game.',
        progress: totalBestScore,
        target: 5000,
        helper: `${gamesWithScores} game${gamesWithScores === 1 ? '' : 's'} currently have a saved score.`,
        ctaLabel: 'Play arcade',
        ctaTab: 'games',
        icon: <Brain className="text-violet-500" size={24} />,
      },
      {
        id: 'progress-proof',
        title: 'PROGRESS PROOF',
        desc: 'Upload 4 progress photos in 30 days to keep visual history current.',
        progress: photos30d,
        target: 4,
        helper: `${photos30d} photo check-in${photos30d === 1 ? '' : 's'} logged in the last 30 days.`,
        ctaLabel: 'Open progress',
        ctaTab: 'progress',
        icon: <Trophy className="text-yellow-500" size={24} />,
      },
    ];
  }, [checkinsCompleted, gamesWithScores, homeData?.progress?.photos30d, homeData?.progress?.workouts7d?.count, homeData?.progress?.workouts7d?.minutes, totalBestScore]);

  return (
    <div className="pb-32">
      <div className="text-center py-6">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Challenges</h2>
        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-bold">
          Progress from workouts, check-ins, and game scores
        </p>
      </div>

      {error ? (
        <Card className="mx-1 mb-4 p-4 bg-rose-500/10 border-rose-500/20 text-sm text-rose-200">
          {error}
        </Card>
      ) : null}

      <div className="space-y-6 px-1">
        <Card
          className="bg-gradient-to-br from-violet-600/20 to-zinc-900 border-violet-500/30 p-5 cursor-pointer group"
          onClick={() => setTab?.('games')}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-violet-600 rounded-2xl shadow-[0_0_20px_rgba(124,58,237,0.4)] group-hover:scale-110 transition-transform">
              <Gamepad2 size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-black italic text-lg uppercase leading-none">Game Center</h3>
              <p className="text-xs text-zinc-400 mt-1">Your best scores count toward challenge progress automatically.</p>
            </div>
            <ChevronRight className="text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
        </Card>

        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 ml-2">Active Challenges</h3>
          <div className="space-y-3">
            {activeChallenges.map((challenge) => {
              const clampedProgress = Math.min(challenge.progress, challenge.target);
              const percent = challenge.target > 0 ? (clampedProgress / challenge.target) * 100 : 0;
              const complete = challenge.progress >= challenge.target;

              return (
                <Card key={challenge.id} className="p-4 bg-zinc-900/50 border-white/5">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div className="flex gap-3">
                      <div className="p-2 bg-zinc-800 rounded-lg">{challenge.icon}</div>
                      <div>
                        <h4 className="font-bold text-sm uppercase">{challenge.title}</h4>
                        <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">{challenge.desc}</p>
                      </div>
                    </div>
                    <div className={`text-[10px] font-black uppercase tracking-widest ${complete ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {complete ? 'Complete' : 'In progress'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      <span>Progress</span>
                      <span>{challenge.progress} / {challenge.target}</span>
                    </div>
                    <div className={`h-1.5 bg-zinc-800 rounded-full ${complete ? 'ring-1 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'shadow-inner'}`}>
                      <div className={`h-full rounded-full transition-all duration-1000 ease-out ${complete ? 'bg-emerald-500' : 'bg-violet-500 shadow-[0_0_10px_rgba(124,58,237,0.5)]'}`} style={{ width: `${percent}%` }} />
                    </div>
                    <div className="text-[10px] text-zinc-500">{challenge.helper}</div>
                    <button
                      onClick={() => setTab?.(challenge.ctaTab)}
                      className="mt-2 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-full border border-zinc-700 hover:bg-white hover:text-black transition-colors"
                    >
                      {challenge.ctaLabel}
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="p-4 bg-zinc-950 border-dashed border-zinc-800 flex flex-col items-center text-center py-8">
          <Trophy className="text-yellow-500 mb-2 opacity-50" size={32} />
          <p className="text-xs text-zinc-500 italic max-w-[240px]">
            Challenge progress updates automatically as you log activity across the app.
          </p>
        </Card>
      </div>
    </div>
  );
}
