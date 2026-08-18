'use client';

import React, { useState } from 'react';
import {
  BookOpen, ChevronRight, Play, Search, Filter,
  Dumbbell, Utensils, Zap, Clock, Star
} from 'lucide-react';
import Card from '../components/Card';

const CATEGORIES = [
  { id: 'all', label: 'ALL FILES', icon: <Filter size={14} /> },
  { id: 'training', label: 'TRAINING', icon: <Dumbbell size={14} /> },
  { id: 'nutrition', label: 'NUTRITION', icon: <Utensils size={14} /> },
  { id: 'recovery', label: 'RECOVERY', icon: <Zap size={14} /> },
];

const LIBRARY_CONTENT = [
  { id: 1, title: 'Shoulder Mobility Flow', type: 'Video', dur: '5m', cat: 'recovery' },
  { id: 2, title: 'Understanding Macros', type: 'Guide', dur: '3m read', cat: 'nutrition' },
  { id: 3, title: 'Squat Mechanics 101', type: 'Video', dur: '12m', cat: 'training' },
  { id: 4, title: 'Sleep & Recovery Science', type: 'Guide', dur: '5m read', cat: 'recovery' },
  { id: 5, title: 'Progressive Overload 101', type: 'Video', dur: '8m', cat: 'training' },
];

export default function LibraryView() {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredContent = activeCategory === 'all'
    ? LIBRARY_CONTENT
    : LIBRARY_CONTENT.filter(item => item.cat === activeCategory);

  return (
    <div className="pb-32">
      <div className="text-center py-8 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-600/10 blur-[100px] -z-10"></div>
        <h2 className="text-3xl font-semibold tracking-tight">Library</h2>
        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-bold">Training, nutrition, and recovery resources</p>
      </div>

      <div className="px-1 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input
            placeholder="Search library"
            className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap transition-all
                ${activeCategory === cat.id ? 'bg-white text-black border-white' : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:text-zinc-300'}
              `}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="grid gap-3">
          {filteredContent.map((item) => (
            <Card key={item.id} className="p-0 overflow-hidden group cursor-pointer border-white/5 bg-zinc-900/30 hover:bg-zinc-900/50 transition-all h-24">
              <div className="flex h-full">
                <div className="w-24 bg-zinc-950 flex items-center justify-center shrink-0 border-r border-white/5 relative overflow-hidden">
                  {item.type === 'Video' ? (
                    <Play size={24} className="text-violet-400 relative z-10 group-hover:scale-110 transition-transform" />
                  ) : (
                    <BookOpen size={24} className="text-emerald-400 relative z-10 group-hover:scale-110 transition-transform" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                </div>

                <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/5">
                      {item.type}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-600 flex items-center gap-1">
                      <Clock size={10} /> {item.dur}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-zinc-100 truncate group-hover:text-white transition-colors">
                    {item.title}
                  </h3>
                </div>

                <div className="w-12 flex items-center justify-center border-l border-white/5 text-zinc-700 group-hover:text-white transition-colors">
                  <ChevronRight size={18} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Coming Soon Callout */}
        <div className="mt-8 p-6 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl text-center">
          <Star className="text-emerald-400 mx-auto mb-3 animate-pulse" size={24} />
          <h4 className="text-xs font-semibold uppercase text-emerald-400 mb-1">Fresh resources</h4>
          <p className="text-[10px] text-emerald-400/60 uppercase font-bold tracking-widest leading-relaxed">
            New training modules and nutrition guides <br /> are added regularly.
          </p>
        </div>
      </div>
    </div>
  );
}
