'use client';

import React from 'react';
import { Trophy, Target, Zap, ChevronRight, Brain, Gamepad2 } from 'lucide-react';
import Card from '../components/Card';

const ACTIVE_CHALLENGES = [
  {
    id: '300-reps',
    title: 'THE 300 CLUB',
    desc: 'Complete 300 total reps of compound movements in a single session.',
    reward: '500 XP + "Spartan" Badge',
    icon: <Target className="text-rose-500" size={24} />,
    progress: 0,
    target: 300
  },
  {
    id: 'neural-sync',
    title: 'NEURAL MASTERY',
    desc: 'Achieve a score of 5,000+ in any Arcade game.',
    reward: '250 XP + "Deep Thinker" Badge',
    icon: <Brain className="text-violet-500" size={24} />,
    progress: 1250,
    target: 5000
  }
];

export default function ChallengesView({ setTab }: { setTab?: (tab: string) => void }) {
  return (
    <div className="pb-32">
      <div className="text-center py-6">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">OPERATIONS center</h2>
        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-bold">Active Challenges & Bounties</p>
      </div>

      <div className="space-y-6 px-1">
        {/* Featured Arcade Link */}
        <Card
          className="bg-gradient-to-br from-violet-600/20 to-zinc-900 border-violet-500/30 p-5 cursor-pointer group"
          onClick={() => setTab?.('games')}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-violet-600 rounded-2xl shadow-[0_0_20px_rgba(124,58,237,0.4)] group-hover:scale-110 transition-transform">
              <Gamepad2 size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-black italic text-lg uppercase leading-none">THE LAB ARCADE</h3>
              <p className="text-xs text-zinc-400 mt-1">4 Neural Performance games live.</p>
            </div>
            <ChevronRight className="text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
        </Card>

        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 ml-2">Active Protocols</h3>
          <div className="space-y-3">
            {ACTIVE_CHALLENGES.map((challenge) => (
              <Card key={challenge.id} className="p-4 bg-zinc-900/50 border-white/5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-3">
                    <div className="p-2 bg-zinc-800 rounded-lg">{challenge.icon}</div>
                    <div>
                      <h4 className="font-bold text-sm uppercase">{challenge.title}</h4>
                      <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">{challenge.desc}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    <span>Progress</span>
                    <span>{challenge.progress} / {challenge.target}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full"
                      style={{ width: `${(challenge.progress / challenge.target) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-yellow-500 uppercase tracking-widest pt-1">
                    <Zap size={10} /> Reward: {challenge.reward}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Global Rankings Callout */}
        <Card className="p-4 bg-zinc-950 border-dashed border-zinc-800 flex flex-col items-center text-center py-8">
          <Trophy className="text-yellow-500 mb-2 opacity-50" size={32} />
          <p className="text-xs text-zinc-500 italic max-w-[200px]">New seasonal challenges drop every Monday at 0500.</p>
        </Card>
      </div>
    </div>
  );
}
