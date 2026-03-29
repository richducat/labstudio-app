'use client';

import { useState } from 'react';
import { MessageCircle, Shield, Users, Flame } from 'lucide-react';
import Card from '../components/Card';

const MOCK_FEED = [
  { id: 1, user: 'Alex M.', action: 'completed the 300 Club challenge!', time: '2h ago', kudos: 12 },
  { id: 2, user: 'Sarah K.', action: 'hit a 7-day workout streak 🔥', time: '5h ago', kudos: 24 },
  { id: 3, user: 'Coach Toby', action: 'posted a new mobility flow in Library.', time: '1d ago', kudos: 45, isCoach: true },
];

export default function CommunityView() {
  const [givenKudos, setGivenKudos] = useState<Record<number, boolean>>({});

  const toggleKudos = (id: number) => {
    setGivenKudos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="pb-32">
      <div className="text-center py-6 px-4">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Community</h2>
        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-bold">Updates from coaches and members</p>
      </div>

      <div className="space-y-4 px-1">
        <Card className="p-5 bg-zinc-900/50 border-white/5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center">
              <Shield size={18} className="text-violet-400" />
            </div>
            <div>
              <div className="font-bold text-sm uppercase tracking-wide">Private member space</div>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Celebrate wins, ask questions, and stay connected with your coaching community.
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <h3 className="font-black text-[10px] text-zinc-500 uppercase tracking-widest ml-2">Recent Activity</h3>
          {MOCK_FEED.map((item) => {
            const hasKudoed = givenKudos[item.id];
            const displayKudos = item.kudos + (hasKudoed ? 1 : 0);
            
            return (
              <Card key={item.id} className="p-4 bg-zinc-900/60 border-white/5 backdrop-blur-md">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-lg ${item.isCoach ? 'bg-yellow-400 text-zinc-950 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'bg-violet-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]'}`}>
                      {item.user.substring(0, 1)}
                    </div>
                    <div>
                      <div className="font-bold text-sm tracking-wide">
                        {item.user} <span className="text-zinc-400 font-normal">{item.action}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-0.5">{item.time}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end border-t border-white/5 pt-3">
                  <button
                    onClick={() => toggleKudos(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      hasKudoed 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)] scale-105' 
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-rose-400'
                    }`}
                  >
                    <Flame size={14} className={hasKudoed ? 'fill-rose-400' : ''} />
                    {displayKudos} Hype
                  </button>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-5 bg-zinc-900/40 border-white/5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-white/5 flex items-center justify-center">
              <MessageCircle size={18} className="text-zinc-300" />
            </div>
            <div>
              <div className="font-bold text-sm uppercase tracking-wide">Share progress</div>
              <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                When posts are available on your account, you&apos;ll be able to keep up with member wins and coach announcements here.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
