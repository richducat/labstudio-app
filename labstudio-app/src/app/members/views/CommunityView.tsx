'use client';

import React from 'react';
import { Users, Heart, MessageCircle, Share2, MoreHorizontal, Shield } from 'lucide-react';
import Card from '../components/Card';

const POSTS = [
  {
    id: 1,
    author: 'Sarah Jenkins',
    initials: 'SJ',
    role: 'Elite Member',
    content: 'Just smashed the "300 Club" challenge! 315 reps total volume. Feeling the power of the Lab protocol today. 🔥',
    time: '2h ago',
    likes: 24,
    comments: 3,
    image: null,
    color: 'bg-violet-600'
  },
  {
    id: 2,
    author: 'Coach Jake',
    initials: 'CJ',
    role: 'Head Coach',
    content: 'New mobility sequence dropped in the Vault today. Focused on hip internal rotation for better squat depth. Check it out!',
    time: '5h ago',
    likes: 42,
    comments: 8,
    image: null,
    color: 'bg-zinc-800'
  }
];

export default function CommunityView() {
  return (
    <div className="pb-32">
      <div className="text-center py-6 px-4">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">LAB NETWORK</h2>
        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-bold">Global Athletic Feed</p>
      </div>

      <div className="space-y-4 px-1">
        {/* Create Post Placeholder */}
        <Card className="p-4 bg-zinc-900/40 border-dashed border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold">ME</div>
            <div className="flex-1 text-xs text-zinc-500 italic">Broadcast a transmission...</div>
          </div>
        </Card>

        {POSTS.map((post) => (
          <Card key={post.id} className="p-0 overflow-hidden bg-zinc-900/50 border-white/5">
            <div className="p-4 border-b border-white/5 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${post.color} flex items-center justify-center font-black text-sm`}>
                  {post.initials}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 leading-none mb-1">
                    <span className="font-bold text-sm uppercase tracking-wide">{post.author}</span>
                    <Shield size={12} className="text-violet-400" />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{post.role} • {post.time}</span>
                </div>
              </div>
              <MoreHorizontal size={16} className="text-zinc-600" />
            </div>

            <div className="p-4">
              <p className="text-sm text-zinc-300 leading-relaxed">{post.content}</p>
            </div>

            <div className="px-4 py-3 bg-black/20 flex items-center gap-6">
              <button className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-rose-400 transition-colors">
                <Heart size={16} /> {post.likes}
              </button>
              <button className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-violet-400 transition-colors">
                <MessageCircle size={16} /> {post.comments}
              </button>
              <button className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors">
                <Share2 size={16} />
              </button>
            </div>
          </Card>
        ))}

        <div className="py-8 text-center text-zinc-600">
          <Users size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-widest">End of Feed</p>
        </div>
      </div>
    </div>
  );
}
