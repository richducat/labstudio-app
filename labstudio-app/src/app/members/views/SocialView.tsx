'use client';

import React, { useEffect, useState } from 'react';
import { Gift, Trophy } from 'lucide-react';
import Card from '../components/Card';

const CHALLENGES = [
  { id: 1, title: '300 Club', desc: 'Reach 300 total reps in a single workout.', reward: 'Badge + 500 points', active: true },
  { id: 2, title: 'Cold Recovery', desc: 'Log 20 total minutes of cold plunge recovery.', reward: 'Free shake', active: false },
];

export default function SocialView() {
  const [leaderboard, setLeaderboard] = useState<Array<{ display_name?: string | null; score?: number | string | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch('/api/lab/games/score?scope=global');
        const data = await res.json();
        if (data.ok && Array.isArray(data.leaderboards)) {
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
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
      <div className="text-center py-6">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Leaderboard</h2>
        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-[0.2em]">Compare your best game scores</p>
      </div>

      {/* Active Challenges */}
      <div className="px-1">
        <h3 className="font-black text-[10px] text-zinc-500 mb-3 uppercase tracking-widest ml-2">Featured Challenges</h3>
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
          <h3 className="font-black text-[10px] text-zinc-500 uppercase tracking-widest">Game Rankings</h3>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
          </div>
        </div>
        <div className="px-2 pb-2 text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
          Combined best scores across your games
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-xs text-zinc-600 font-bold uppercase tracking-widest">Loading rankings...</div>
          ) : leaderboard.length > 0 ? (
            leaderboard.map((u, i) => {
              const isFirst = i === 0;
              return (
              <div
                key={i}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-colors ${
                  isFirst 
                    ? 'bg-gradient-to-r from-yellow-500/20 to-zinc-900/50 border border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)] ring-1 ring-yellow-500/20' 
                    : 'bg-zinc-900/50 border border-white/5 hover:bg-zinc-900'
                }`}
                style={{ 
                  animationFillMode: 'both', 
                  animationDuration: '0.5s', 
                  animationDelay: `${i * 100}ms`, 
                  animationName: 'slideUpFade' 
                }}
              >
                <div className={`font-black italic text-lg w-6 text-center ${isFirst ? 'text-yellow-500' : 'text-zinc-700'}`}>#{i + 1}</div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white ${
                  isFirst 
                    ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)] text-yellow-950' 
                    : 'bg-violet-600 shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                }`}>
                  {u.display_name?.substring(0, 2).toUpperCase() || '??'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm uppercase tracking-wide truncate">{u.display_name || 'Anonymous'}</div>
                  <div className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.1em]">Member</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-black text-violet-400 text-sm">{(u.score || 0).toLocaleString()}</div>
                  <div className="text-[9px] text-zinc-600 font-bold uppercase">Points</div>
                </div>
              </div>
            );
            })
          ) : (
            <div className="text-center py-12 px-8 bg-zinc-900/40 rounded-3xl border border-dashed border-zinc-800">
              <Trophy className="mx-auto text-zinc-800 mb-2" size={32} />
              <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">No scores uploaded yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
