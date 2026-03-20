'use client';

import { MessageCircle, Shield, Users } from 'lucide-react';
import Card from '../components/Card';

export default function CommunityView() {
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

        <Card className="p-8 bg-zinc-900/30 border-dashed border-zinc-800 text-center">
          <Users size={36} className="mx-auto text-zinc-700 mb-3" />
          <h3 className="text-lg font-black italic uppercase">Nothing new right now</h3>
          <p className="mt-2 text-sm text-zinc-500 max-w-[280px] mx-auto">
            New posts and announcements will appear here as your coaches and community share updates.
          </p>
        </Card>

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
