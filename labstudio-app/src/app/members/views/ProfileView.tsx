'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Dumbbell,
  Edit3,
  Flame,
  Heart,
  MessageSquare,
  Share2,
  TrendingUp,
  Trophy,
  User,
  Zap,
  Smartphone,
  CheckCircle,
  Wifi,
  Brain,
} from 'lucide-react';
import Card from '../components/Card';

type Profile = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  goal?: string | null;
  handle?: string | null;
  bio?: string | null;
  weight_lbs?: number | null;
  body_fat_pct?: number | null;
  height_in?: number | null;
  joined_at?: string | null;
  wearables_json?: Record<string, { connected: boolean; last_sync?: string }>;
};

type HomeData = {
  latestStats?: { weight_lbs?: string | number | null; body_fat_pct?: string | number | null; resting_hr?: number | null } | null;
  progress?: {
    workouts7d?: { count: number; minutes: number } | null;
  } | null;
};

export default function ProfileView() {
  const [subTab, setSubTab] = useState<'journey' | 'vitals' | 'badges'>('journey');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [homeData, setHomeData] = useState<HomeData | null>(null);

  useEffect(() => {
    fetch('/api/lab/profile')
      .then((r) => r.json())
      .then((j) => { if (j?.ok) setProfile(j.profile ?? null); })
      .catch(() => { });

    fetch('/api/lab/home')
      .then((r) => r.json())
      .then((j) => { if (j?.ok) setHomeData(j.home ?? null); })
      .catch(() => { });
  }, []);

  const name = useMemo(() => {
    const n = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
    return n || 'Athlete';
  }, [profile?.first_name, profile?.last_name]);

  const handle = profile?.handle ? `@${profile.handle}` : `@${(profile?.first_name ?? 'athlete').toLowerCase()}_lab`;

  const weight = homeData?.latestStats?.weight_lbs ?? profile?.weight_lbs ?? null;
  const bf = homeData?.latestStats?.body_fat_pct ?? profile?.body_fat_pct ?? null;
  const workouts7d = homeData?.progress?.workouts7d?.count ?? 0;

  const joinedStr = profile?.joined_at
    ? new Date(profile.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Recently';

  const connectedDevices = useMemo(() => {
    const w = profile?.wearables_json || {};
    return Object.keys(w).filter(k => w[k]?.connected);
  }, [profile?.wearables_json]);

  return (
    <div className="pb-20 relative">
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-violet-900/40 to-zinc-950 z-0" />

      <div className="relative z-10 flex justify-between items-center mb-4 px-2 pt-2">
        <div className="p-2 bg-black/20 backdrop-blur rounded-full border border-white/5">
          <ArrowLeft size={20} className="text-zinc-500" />
        </div>
        <div className="flex gap-2">
          <button className="p-2 bg-black/20 backdrop-blur rounded-full border border-white/5 hover:bg-black/40">
            <Share2 size={18} className="text-zinc-400" />
          </button>
          <button className="p-2 bg-black/20 backdrop-blur rounded-full border border-white/5 hover:bg-black/40">
            <Edit3 size={18} className="text-zinc-400" />
          </button>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center mb-6">
        <div className="w-24 h-24 rounded-full bg-zinc-800 border-4 border-zinc-950 relative mb-3 shadow-2xl">
          <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-zinc-800">
            <User size={40} className="text-zinc-600" />
          </div>
          <div className="absolute bottom-0 right-0 bg-zinc-950 p-1 rounded-full shadow-lg">
            <div className="bg-violet-600 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border border-zinc-950 shadow-[0_0_10px_rgba(124,58,237,0.5)]">
              LVL 1
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-black italic uppercase leading-none mb-1 flex items-center gap-2">
          {name}
          <CheckCircle size={16} className="text-blue-500" fill="currentColor" />
        </h2>
        <div className="text-zinc-500 text-sm font-medium mb-3">{handle}</div>

        <div className="flex gap-8 text-sm mb-6 mt-2">
          <div className="flex flex-col items-center">
            <span className="font-black text-lg text-white leading-none">{workouts7d}</span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Sessions</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-black text-lg text-white leading-none">{weight != null ? `${weight}` : '—'}</span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Weight</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-black text-lg text-white leading-none">88</span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Bio Score</span>
          </div>
        </div>

        {profile?.bio ? (
          <p className="text-sm text-zinc-400 max-w-xs leading-relaxed mb-4">{profile.bio}</p>
        ) : (
          <p className="text-sm text-zinc-600 max-w-xs mb-4">Mastering the architecture of performance at The Lab Studio.</p>
        )}

        <div className="flex gap-3">
          {connectedDevices.map(d => (
            <div key={d} className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5 text-[9px] font-black text-emerald-400 uppercase tracking-tighter">
              <Smartphone size={10} /> {d} SYNCED
            </div>
          ))}
        </div>
      </div>

      <div className="flex border-b border-white/10 mb-6 relative z-10 mx-[-16px] px-4">
        {(['journey', 'vitals', 'badges'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${subTab === t ? 'border-violet-500 text-white' : 'border-transparent text-zinc-600 hover:text-zinc-400'
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      {subTab === 'journey' && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <Card className="p-4 bg-zinc-900 border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition">
              <Dumbbell size={60} />
            </div>
            <div className="flex gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center text-violet-400 border border-violet-500/20 shrink-0">
                <Dumbbell size={18} />
              </div>
              <div>
                <div className="font-bold text-sm">Primal Strength Session</div>
                <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">2 HOURS AGO • THE LAB STUDIO</div>
              </div>
            </div>
            <div className="bg-black/40 rounded-xl p-4 text-sm text-zinc-300 mb-4 border border-white/5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">VOLUME</div>
                  <div className="font-black text-white italic">12,400 LBS</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">INTENSITY</div>
                  <div className="font-black text-white italic text-emerald-400">HIGH</div>
                </div>
              </div>
            </div>
            <div className="flex gap-6 text-zinc-500 text-xs font-bold px-1">
              <button className="flex items-center gap-1.5 hover:text-white transition"><Heart size={16} /> 12</button>
              <button className="flex items-center gap-1.5 hover:text-white transition"><MessageSquare size={16} /> 4</button>
            </div>
          </Card>

          <Card className="p-4 bg-zinc-900 border-white/5 opacity-80">
            <div className="flex gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center text-yellow-500 border border-yellow-500/20 shrink-0">
                <Trophy size={18} />
              </div>
              <div>
                <div className="font-bold text-sm">Joined the Inner Circle</div>
                <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">MEMBER SINCE {joinedStr.toUpperCase()}</div>
              </div>
            </div>
            <p className="text-sm text-zinc-500 italic">&ldquo;The only bad workout is the one that didn&apos;t happen.&rdquo;</p>
          </Card>
        </div>
      )}

      {subTab === 'vitals' && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 bg-zinc-900 border-white/5 group hover:border-violet-500/30 transition shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <div className="text-zinc-500 text-[10px] uppercase tracking-widest font-black leading-none">Weight</div>
                {connectedDevices.includes('apple') && <Smartphone size={10} className="text-rose-500" />}
              </div>
              <div className="text-3xl font-black italic">{weight != null ? weight : '—'} <span className="text-xs text-zinc-500 font-black not-italic ml-[-4px]">LB</span></div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp size={10} className="text-rose-500" />
                <span className="text-[9px] font-black text-rose-500 uppercase">+2.4% THIS WK</span>
              </div>
            </Card>
            <Card className="p-4 bg-zinc-900 border-white/5 group hover:border-violet-500/30 transition shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <div className="text-zinc-500 text-[10px] uppercase tracking-widest font-black leading-none">Body Fat</div>
                {connectedDevices.includes('oura') && <Wifi size={10} className="text-white" />}
              </div>
              <div className="text-3xl font-black italic text-emerald-400">{bf != null ? `${bf}%` : '—'}</div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp size={10} className="text-emerald-500 rotate-180" />
                <span className="text-[9px] font-black text-emerald-500 uppercase">-1.1% THIS MO</span>
              </div>
            </Card>
          </div>

          <Card className="p-5 bg-zinc-900 border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <Zap size={20} className="text-violet-500 opacity-20" />
            </div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Performance Index</div>
                <div className="text-lg font-black italic">Recovery & Load Capacity</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black italic text-violet-400">88/100</div>
              </div>
            </div>
            <div className="h-24 flex items-end gap-2.5 px-1">
              {[60, 45, 80, 70, 95, 85, 88].map((h, i) => (
                <div key={i} className="flex-1 bg-zinc-800 rounded-t-lg relative group overflow-hidden">
                  <div
                    className={`absolute inset-x-0 bottom-0 rounded-t-lg transition-all duration-1000 ${i === 6 ? 'bg-violet-600 shadow-[0_0_15px_rgba(124,58,237,0.5)]' : 'bg-zinc-700/50 group-hover:bg-zinc-600'}`}
                    style={{ height: `${h}%` }}
                  />
                  {i === 6 && <div className="absolute top-[-15px] left-1/2 -translate-x-1/2 text-[8px] font-black text-violet-400">TODAY</div>}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 bg-zinc-900 border-white/10 space-y-3">
            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-2">Verified Connections</div>
            {connectedDevices.length > 0 ? (
              <div className="space-y-3">
                {connectedDevices.map(d => (
                  <div key={d} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone size={14} className="text-zinc-500" />
                      <span className="text-xs font-bold uppercase">{d} Health Sync</span>
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400">ACTIVE</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-600 italic">No devices synced. Head to the Wearables tab to connect.</div>
            )}
          </Card>
        </div>
      )}

      {subTab === 'badges' && (
        <div className="grid grid-cols-3 gap-3 animate-in fade-in duration-500">
          {[
            { id: 1, name: 'Founder', icon: Trophy, color: 'text-yellow-500', active: true },
            { id: 2, name: '7D Streak', icon: Flame, color: 'text-orange-500', active: true },
            { id: 3, name: '1k Club', icon: Dumbbell, color: 'text-zinc-600', active: false },
            { id: 4, name: 'Power Lifter', icon: Zap, color: 'text-violet-500', active: true },
            { id: 5, name: 'Clean Diet', icon: Heart, color: 'text-zinc-600', active: false },
            { id: 6, name: 'Bio Hacker', icon: Brain, color: 'text-cyan-400', active: true },
          ].map((b) => (
            <div key={b.id} className={`aspect-square bg-zinc-900 rounded-2xl border border-white/5 flex flex-col items-center justify-center p-3 text-center transition-all ${!b.active && 'opacity-30 grayscale'}`}>
              <b.icon size={28} className={`${b.color} mb-3`} />
              <div className="text-[10px] font-black uppercase tracking-tighter leading-tight">{b.name}</div>
            </div>
          ))}
          <div className="col-span-3 rounded-2xl border border-white/5 bg-zinc-900/40 p-5 text-center mt-2">
            <div className="text-xs text-zinc-500 max-w-[200px] mx-auto leading-relaxed">
              Complete elite challenges at The Lab to unlock performance badges.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
