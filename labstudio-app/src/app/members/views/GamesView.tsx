'use client';

import React, { useState, useEffect } from 'react';
import {
  Trophy, Zap, Brain, LayoutGrid,
  Settings, Gamepad2, ArrowRight, Activity
} from 'lucide-react';
import Card from '../components/Card';
import GearSort from '@/app/members/views/games/GearSort';
import PatternMaster from '@/app/members/views/games/PatternMaster';
import ReactionLab from '@/app/members/views/games/ReactionLab';
import NeuroGrid from '@/app/members/views/games/NeuroGrid';
import { type LabTab } from '../tabs';

interface HighScoreRow {
  game_id: string;
  top_score: number | string;
}

const GAMES = [
  {
    id: 'gear-sort',
    title: 'GEAR SORT',
    subtitle: 'Sorting',
    desc: 'Sort each color into its own tube as efficiently as you can.',
    icon: <Settings className="text-violet-400" size={32} />,
    color: 'from-violet-600/20 to-zinc-900',
    borderColor: 'border-violet-500/30',
    xpPerWin: 50,
    tags: ['Brain', 'Speed']
  },
  {
    id: 'pattern-master',
    title: 'PATTERN MASTER',
    subtitle: 'Sequence Recall',
    desc: 'Watch the sequence, then repeat it from memory.',
    icon: <Brain className="text-pink-400" size={32} />,
    color: 'from-pink-600/20 to-zinc-900',
    borderColor: 'border-pink-500/30',
    xpPerWin: 30,
    tags: ['Memory', 'Focus']
  },
  {
    id: 'reaction-lab',
    title: 'REACTION LAB',
    subtitle: 'Reaction Speed',
    desc: 'Tap as many targets as you can in 30 seconds.',
    icon: <Zap className="text-yellow-400" size={32} />,
    color: 'from-yellow-600/20 to-zinc-900',
    borderColor: 'border-yellow-500/30',
    xpPerWin: 40,
    tags: ['Reflex', 'Speed']
  },
  {
    id: 'neuro-grid',
    title: 'NEURO GRID',
    subtitle: 'Visual Processing',
    desc: 'Find the mismatch in each grid before time runs out.',
    icon: <LayoutGrid className="text-cyan-400" size={32} />,
    color: 'from-cyan-600/20 to-zinc-900',
    borderColor: 'border-cyan-500/30',
    xpPerWin: 60,
    tags: ['Visual', 'Logic']
  }
];

export default function GamesView({ setTab }: { setTab?: (tab: LabTab) => void }) {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [highScores, setHighScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScores() {
      try {
        const res = await fetch('/api/lab/games/score');
        const data = await res.json();
        if (data.ok && Array.isArray(data.highScores)) {
          const scores: Record<string, number> = {};
          (data.highScores as HighScoreRow[]).forEach((s) => {
            scores[s.game_id] = Number(s.top_score) || 0;
          });
          setHighScores(scores);
        }
      } catch (err) {
        console.error('Failed to fetch high scores', err);
      } finally {
        setLoading(false);
      }
    }
    fetchScores();
  }, [activeGame]);

  if (activeGame === 'gear-sort') return <GearSort onExit={() => setActiveGame(null)} />;
  if (activeGame === 'pattern-master') return <PatternMaster onExit={() => setActiveGame(null)} />;
  if (activeGame === 'reaction-lab') return <ReactionLab onExit={() => setActiveGame(null)} />;
  if (activeGame === 'neuro-grid') return <NeuroGrid onExit={() => setActiveGame(null)} />;

  return (
    <div className="pb-32">
      <div className="text-center py-8 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-violet-600/10 blur-[100px] -z-10"></div>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter flex items-center justify-center gap-3">
          <Gamepad2 className="text-violet-500" size={32} />
          Brain Training
        </h2>
        <p className="text-zinc-500 text-xs uppercase tracking-[0.2em] mt-1 font-bold">Focus, memory, reaction, and visual scanning</p>
      </div>

      <div className="grid gap-4 px-4">
        {GAMES.map((game) => (
          <Card
            key={game.id}
            className={`p-1 relative overflow-hidden group cursor-pointer border-none bg-gradient-to-br ${game.color} hover:ring-2 hover:ring-violet-500/50 transition-all duration-300`}
            onClick={() => setActiveGame(game.id)}
          >
            <div className={`bg-zinc-950/80 backdrop-blur-md p-4 rounded-xl border ${game.borderColor} h-full`}>
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-zinc-900 rounded-2xl border border-white/5 group-hover:scale-110 transition-transform duration-500">
                  {game.icon}
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex gap-1">
                    {game.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-400 mt-2 flex items-center gap-1">
                    <Activity size={10} /> +{game.xpPerWin} points
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black uppercase italic tracking-wide">{game.title}</h3>
                <p className="text-zinc-400 text-xs leading-relaxed mt-1 mb-4 line-clamp-2">{game.desc}</p>
              </div>

              <div className="flex items-end justify-between border-t border-white/5 pt-4">
                <div>
                  <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">High Score</p>
                  <p className="text-white font-black text-lg">
                    {loading ? '...' : (highScores[game.id] || 0).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-violet-400 font-bold text-xs uppercase group-hover:gap-4 transition-all duration-300">
                  Play <ArrowRight size={14} />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Stats/Leaderboard Callout */}
      <div className="mt-8 px-4">
        <Card className="bg-zinc-900/40 border-dashed border-zinc-800 p-6 text-center">
          <Trophy className="mx-auto text-yellow-500 mb-3" size={32} />
          <h4 className="text-sm font-bold uppercase italic">Leaderboard</h4>
          <p className="text-xs text-zinc-500 mt-1 mb-4">See how your best scores compare with other members.</p>
          <button
            onClick={() => setTab?.('social')}
            className="text-[10px] font-black uppercase tracking-widest px-4 py-2 border border-zinc-700 rounded-full hover:bg-white hover:text-black transition-colors"
          >
            View Leaderboard
          </button>
        </Card>
      </div>
    </div>
  );
}
