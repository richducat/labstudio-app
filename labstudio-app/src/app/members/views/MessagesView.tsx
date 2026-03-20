'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, MessageSquare, Search, ShieldCheck } from 'lucide-react';
import { type LabTab } from '../tabs';

const THREADS = [
  {
    id: 'toby',
    name: 'Toby',
    lastMsg: 'Your daily focus is ready.',
    time: '2m ago',
    unread: true,
    avatar: 'T',
    color: 'bg-violet-600',
    isAi: true,
    cta: { label: 'Open coach', tab: 'coach' as LabTab },
    messages: [
      { id: 't1', from: 'them', text: 'I refreshed your focus based on your recent activity.', time: 'Today 8:14 AM' },
      { id: 't2', from: 'me', text: 'What should I prioritize next?', time: 'Today 8:15 AM' },
      { id: 't3', from: 'them', text: 'Open the coach tab to review your plan and save the version you want to keep today.', time: 'Today 8:16 AM' },
    ],
  },
  {
    id: 'member-services',
    name: 'Member Services',
    lastMsg: 'Welcome to Lab Studio. Finish your profile to personalize your experience.',
    time: '1d ago',
    unread: false,
    avatar: 'MS',
    color: 'bg-zinc-800',
    isAi: false,
    cta: { label: 'Open profile', tab: 'profile' as LabTab },
    messages: [
      { id: 'm1', from: 'them', text: 'Welcome to Lab Studio.', time: 'Yesterday 9:00 AM' },
      { id: 'm2', from: 'them', text: 'Complete your profile, log your check-ins, and keep your schedule current so your experience stays personalized.', time: 'Yesterday 9:01 AM' },
    ],
  },
] as const;

export default function MessagesView({ setTab }: { setTab?: (tab: LabTab) => void }) {
  const [query, setQuery] = useState('');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const visibleThreads = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return THREADS;

    return THREADS.filter((thread) => {
      const haystack = [
        thread.name,
        thread.lastMsg,
        ...thread.messages.map((message) => message.text),
      ].join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }, [query]);

  const activeThread = THREADS.find((thread) => thread.id === activeThreadId) ?? null;

  if (activeThread) {
    return (
      <div className="pb-32 space-y-6">
        <div className="flex items-center justify-between py-6 px-2">
          <button
            onClick={() => setActiveThreadId(null)}
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Inbox
          </button>
          {activeThread.cta ? (
            <button
              onClick={() => setTab?.(activeThread.cta.tab)}
              className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-full bg-violet-600 text-white hover:bg-violet-500 transition-colors"
            >
              {activeThread.cta.label}
            </button>
          ) : null}
        </div>

        <div className="px-1">
          <div className="flex items-center gap-4 p-4 border border-white/5 rounded-2xl bg-zinc-900/70">
            <div className={`relative w-12 h-12 rounded-2xl ${activeThread.color} flex items-center justify-center font-black text-sm`}>
              {activeThread.avatar}
              {activeThread.isAi ? (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-zinc-950 rounded-full" />
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm uppercase tracking-wide">{activeThread.name}</span>
                {activeThread.isAi ? <ShieldCheck size={12} className="text-violet-400" /> : null}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Conversation history</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-1">
          {activeThread.messages.map((message) => {
            const mine = message.from === 'me';
            return (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-2xl px-4 py-3 border ${mine
                  ? 'ml-auto bg-violet-600/15 border-violet-500/30 text-zinc-100'
                  : 'bg-zinc-900 border-white/5 text-zinc-200'
                  }`}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
                <div className="mt-2 text-[10px] uppercase tracking-widest text-zinc-500">{message.time}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32">
      <div className="py-6 px-2 space-y-4">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Messages</h2>
        <label className="flex items-center gap-3 rounded-2xl border border-white/5 bg-zinc-900/80 px-4 py-3">
          <Search size={18} className="text-zinc-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search threads"
            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
          />
        </label>
      </div>

      <div className="space-y-1">
        {visibleThreads.map((thread) => (
          <button
            key={thread.id}
            onClick={() => setActiveThreadId(thread.id)}
            className={`w-full text-left flex items-center gap-4 p-4 transition-all border-b border-white/5 ${thread.unread ? 'bg-violet-600/5' : 'hover:bg-zinc-900/50'
              }`}
          >
            <div className={`relative w-12 h-12 rounded-2xl ${thread.color} flex items-center justify-center font-black text-sm`}>
              {thread.avatar}
              {thread.isAi ? (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-zinc-950 rounded-full" />
              ) : null}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm uppercase tracking-wide">{thread.name}</span>
                  {thread.isAi ? <ShieldCheck size={12} className="text-violet-400" /> : null}
                </div>
                <span className="text-[10px] text-zinc-500 font-bold">{thread.time}</span>
              </div>
              <p className={`text-xs truncate ${thread.unread ? 'text-zinc-200 font-semibold' : 'text-zinc-500'}`}>
                {thread.lastMsg}
              </p>
            </div>

            <ChevronRight size={16} className="text-zinc-700" />
          </button>
        ))}
      </div>

      {!visibleThreads.length ? (
        <div className="mt-12 text-center p-8 opacity-60">
          <MessageSquare size={48} className="mx-auto text-zinc-800 mb-2" />
          <p className="text-sm text-zinc-400">No threads match &ldquo;{query}&rdquo;.</p>
        </div>
      ) : null}
    </div>
  );
}
