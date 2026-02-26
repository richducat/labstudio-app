'use client';

import React, { useEffect, useState } from 'react';
import { Gift, Trophy, Activity, Brain, Zap, LayoutGrid } from 'lucide-react';
import Card from '../components/Card';

const CHALLENGES = [
  { id: 1, title: 'The 300', desc: '300 Reps total volume in one session.', reward: 'Badge + 500 XP', active: true },
  { id: 2, title: 'Ice King', desc: 'Accumulate 20 mins in cold plunge.', reward: 'Free Shake', active: false },
];

export default function SocialView() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch('/api/lab/games/score?gameId=gear-sort');
        const data = await res.json();
        if (data.ok) {
          setLeaderboard(data.leaderboards);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  return (
    <div className="pb-32 space-y-6">
      <div className="bg-emerald-600 text-[10px] text-white p-1 text-center font-bold">SOCIAL_INTERFACE_ACTIVE</div>
      <div className="text-center py-6">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">SQUAD OVERWATCH</h2>
        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-[0.2em]">Global Performance Rankings</p>
      </div>

      {/* Active Challenges */}
      <div className="px-1">
        <h3 className="font-black text-[10px] text-zinc-500 mb-3 uppercase tracking-widest ml-2">Active Operations</h3>
        <div className="space-y-3">
          {CHALLENGES.map((c) => (
            <Card key={c.id} className={`p-4 ${c.active ? 'border-violet-500/50 bg-violet-900/10' : 'opacity-70 grayscale'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-lg italic tracking-tight uppercase">{c.title}</div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${c.active ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                  {c.active ? 'ACTIVE' : 'LOCKED'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{c.desc}</p>
              <div className="flex items-center gap-2 text-[10px] font-black text-yellow-500 uppercase tracking-widest">
                <Gift size={12} /> REWARD: {c.reward}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-3 px-2">
          <h3 className="font-black text-[10px] text-zinc-500 uppercase tracking-widest">Arcade Rankings</h3>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
          </div>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-xs text-zinc-600 font-bold uppercase tracking-widest">Decrypting rankings...</div>
          ) : leaderboard.length > 0 ? (
            leaderboard.map((u, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:bg-zinc-900 transition-colors"
              >
                <div className="font-black italic text-lg w-6 text-center text-zinc-700">#{i + 1}</div>
                <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-xs font-black text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                  {u.display_name?.substring(0, 2).toUpperCase() || '??'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm uppercase tracking-wide truncate">{u.display_name || 'Anonymous'}</div>
                  <div className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.1em]">Verified Archive</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-black text-violet-400 text-sm">{(u.score || 0).toLocaleString()}</div>
                  <div className="text-[9px] text-zinc-600 font-bold uppercase">Points</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 px-8 bg-zinc-900/40 rounded-3xl border border-dashed border-zinc-800">
              <Trophy className="mx-auto text-zinc-800 mb-2" size={32} />
              <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">No scores uploaded yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Visual Stats Callout */}
      <div className="px-1">
        <Card className="p-6 bg-gradient-to-br from-zinc-900 to-black border-white/5 flex flex-col items-center text-center">
          <Activity className="text-emerald-500 mb-3" size={32} />
          <h4 className="text-xs font-black uppercase italic tracking-widest mb-1">Squad Efficiency: 94%</h4>
          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest leading-relaxed">
            We are outperforming the regional <br /> baseline by 12% this week.
          </p>
        </Card>
      </div>
    </div>
  );
}
