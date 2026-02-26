'use client';

import React from 'react';
import { MessageSquare, Search, ChevronRight, User, ShieldCheck } from 'lucide-react';
import Card from '../components/Card';

const THREADS = [
  {
    id: 'toby',
    name: 'TOBY AI',
    lastMsg: 'Optimization protocol complete. Check your new performance index.',
    time: '2m ago',
    unread: true,
    avatar: 'T',
    color: 'bg-violet-600',
    isAi: true
  },
  {
    id: 'coach-jake',
    name: 'Coach Jake',
    lastMsg: 'Great session today. Your squat depth is improving significantly.',
    time: '4h ago',
    unread: false,
    avatar: 'CJ',
    color: 'bg-zinc-800',
    isAi: false
  },
  {
    id: 'lab-hq',
    name: 'Lab HQ',
    lastMsg: 'Welcome to the Lab Ultimate. Your digital athlete profile is live.',
    time: '1d ago',
    unread: false,
    avatar: 'LH',
    color: 'bg-zinc-800',
    isAi: false
  }
];

export default function MessagesView({ setTab }: { setTab?: (tab: string) => void }) {
  return (
    <div className="pb-32">
      <div className="flex items-center justify-between py-6 px-2">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">COMMS CENTER</h2>
        <div className="p-2 bg-zinc-900 rounded-lg text-zinc-500 hover:text-white cursor-pointer transition-colors">
          <Search size={18} />
        </div>
      </div>

      <div className="space-y-1">
        {THREADS.map((thread) => (
          <div
            key={thread.id}
            onClick={() => thread.id === 'toby' ? setTab?.('coach') : null}
            className={`
              flex items-center gap-4 p-4 cursor-pointer transition-all border-b border-white/5
              ${thread.unread ? 'bg-violet-600/5' : 'hover:bg-zinc-900/50'}
            `}
          >
            <div className={`relative w-12 h-12 rounded-2xl ${thread.color} flex items-center justify-center font-black text-sm`}>
              {thread.avatar}
              {thread.isAi && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-zinc-950 rounded-full"></div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm uppercase tracking-wide">{thread.name}</span>
                  {thread.isAi && <ShieldCheck size={12} className="text-violet-400" />}
                </div>
                <span className="text-[10px] text-zinc-500 font-bold">{thread.time}</span>
              </div>
              <p className={`text-xs truncate ${thread.unread ? 'text-zinc-200 font-semibold' : 'text-zinc-500'}`}>
                {thread.lastMsg}
              </p>
            </div>

            <ChevronRight size={16} className="text-zinc-700" />
          </div>
        ))}
      </div>

      <div className="mt-12 text-center p-8 opacity-40">
        <MessageSquare size={48} className="mx-auto text-zinc-800 mb-2" />
        <p className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-600">Secure Protocol v4.2</p>
      </div>
    </div>
  );
}
