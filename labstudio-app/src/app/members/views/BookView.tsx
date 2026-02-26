'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Clock,
  Info,
  MapPin,
  Zap,
} from 'lucide-react';
import Card from '../components/Card';

const SERVICES = [
  { id: 'intro', name: 'Intro Assessment', price: 49, time: '45m', desc: 'Movement screen & strategy.', xp: 100, type: 'Strategy' },
  { id: 'pt60', name: '1:1 Protocol', price: 95, time: '60m', desc: 'Full guided hypertrophy session.', xp: 200, type: 'Strength' },
  { id: 'recovery', name: 'Ice & Heat', price: 59, time: '30m', desc: 'Contrast therapy via sauna/plunge.', xp: 150, type: 'Recovery' },
  { id: 'mobility', name: 'Flow State', price: 55, time: '45m', desc: 'Active mobility & joint health.', xp: 120, type: 'Mobility' },
];

const TOBY_PICK_ID = 'pt60';
const TOBY_REASON = 'High protein intake detected. Recovery optimal. Prime time for Hypertrophy.';

const BADGE_COLORS: Record<string, string> = {
  violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  blue: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

function Badge({ children, color = 'violet' }: { children: React.ReactNode; color?: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${BADGE_COLORS[color] ?? BADGE_COLORS.violet}`}>
      {children}
    </span>
  );
}

type Service = typeof SERVICES[number];

type HomeStats = {
  latestStats?: { weight_lbs?: string | number | null } | null;
  progress?: { workouts7d?: { count: number } } | null;
};

export default function BookView() {
  const [step, setStep] = useState(1);
  const [selection, setSelection] = useState<{ service?: Service; time?: string }>({});
  const [homeStats, setHomeStats] = useState<HomeStats | null>(null);

  useEffect(() => {
    fetch('/api/lab/home')
      .then((r) => r.json())
      .then((data) => { if (data?.ok) setHomeStats(data.home); })
      .catch(() => { });
  }, []);

  const recommended = SERVICES.find((s) => s.id === TOBY_PICK_ID)!;
  const others = SERVICES.filter((s) => s.id !== TOBY_PICK_ID);

  const recScore = 88; // placeholder until wearable data available
  const lastWorkoutCount = homeStats?.progress?.workouts7d?.count ?? 0;
  const currentWeight = homeStats?.latestStats?.weight_lbs ?? '—';

  const handleBook = async () => {
    // Award XP and navigate back (POST /api/lab/workouts for tracking)
    try {
      await fetch('/api/lab/workouts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: selection.service?.name ?? 'session', note: `Booked ${selection.time}` }),
      });
    } catch { /* ignore */ }
    setStep(3);
  };

  if (step === 3) {
    return (
      <div className="text-center py-10 space-y-8">
        <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500 border border-green-500/20 shadow-[0_0_40px_-10px_rgba(34,197,94,0.4)]">
          <CheckCircle size={48} />
        </div>
        <div>
          <h2 className="text-3xl font-black italic mb-2">LOCKED IN.</h2>
          <p className="text-zinc-400">
            +<span className="text-yellow-400 font-mono font-bold">{selection.service?.xp ?? 0} XP</span> earned for committing.
          </p>
        </div>
        <div className="p-6 bg-zinc-900/50 backdrop-blur rounded-2xl border border-zinc-800 max-w-xs mx-auto text-sm text-left relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-violet-500" />
          <div className="text-xs font-bold text-zinc-500 mb-2 tracking-widest">SESSION DETAILS</div>
          <div className="font-black text-xl text-white mb-1">{selection.service?.name}</div>
          <div className="flex items-center gap-2 text-violet-400 font-mono mb-4">
            <Clock size={14} />
            <span>Tomorrow @ {selection.time}</span>
          </div>
          <div className="pt-4 border-t border-white/5 flex items-center gap-2 text-zinc-400 text-xs">
            <MapPin size={12} /> 3280 Suntree Blvd, Melbourne, FL
          </div>
        </div>
        <button
          onClick={() => { setStep(1); setSelection({}); }}
          className="w-full py-3 px-6 rounded-xl font-bold bg-violet-600 text-white hover:bg-violet-500 transition"
        >
          Return to Base
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-black italic uppercase">Book Session</h2>
        {step === 2 && (
          <button onClick={() => setStep(1)} className="text-xs text-zinc-500 underline flex items-center gap-1">
            <ChevronRight className="rotate-180" size={12} /> Back
          </button>
        )}
      </div>

      {/* STEP 1: Choose Protocol */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Bio-Analysis */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">
              <Zap size={14} /> Bio-Analysis
            </div>
            <div className="flex gap-6">
              <div>
                <div className="text-[10px] text-zinc-500 mb-1">RECOVERY SCORE</div>
                <div className="text-2xl font-mono font-bold text-emerald-400">{recScore}%</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 mb-1">SESSIONS (7D)</div>
                <div className="text-sm font-bold">{lastWorkoutCount}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 mb-1">WEIGHT</div>
                <div className="text-sm font-bold">{currentWeight} lbs</div>
              </div>
            </div>
          </div>

          {/* Toby's Pick */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">TOBY&apos;S PICK</div>
              <div className="h-px bg-zinc-800 flex-1" />
            </div>
            <Card
              onClick={() => { setSelection({ service: recommended }); setStep(2); }}
              className="cursor-pointer border-violet-500/40 bg-violet-900/10 hover:bg-violet-900/20 transition group active:scale-[0.98]"
            >
              <div className="absolute top-0 right-0 bg-violet-600 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg z-10">
                OPTIMAL
              </div>
              <div className="p-4 pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-lg text-white">{recommended.name}</div>
                    <Badge color="violet">{recommended.type}</Badge>
                  </div>
                  <div className="text-right">
                    <span className="block font-mono text-white font-bold">${recommended.price}</span>
                    <span className="text-[10px] text-violet-400 font-mono">+{recommended.xp} XP</span>
                  </div>
                </div>
                <div className="flex gap-2 items-start mt-3 bg-black/20 p-2 rounded-lg">
                  <Info size={14} className="text-violet-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-400 leading-tight">
                    <span className="text-violet-400 font-bold">Insight: </span>
                    {TOBY_REASON}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Other Protocols */}
          <div>
            <div className="text-xs font-bold text-zinc-500 mb-3 tracking-widest uppercase">Other Protocols</div>
            <div className="space-y-3">
              {others.map((s) => (
                <Card
                  key={s.id}
                  onClick={() => { setSelection({ service: s }); setStep(2); }}
                  className="p-4 cursor-pointer hover:bg-zinc-800 transition group active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="font-bold text-lg">{s.name}</div>
                      <div className="flex gap-2 mt-1">
                        <Badge color="blue">{s.type}</Badge>
                        <span className="text-xs text-zinc-500 flex items-center gap-1"><Clock size={10} /> {s.time}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block font-mono text-zinc-400 font-bold">${s.price}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Pick Time */}
      {step === 2 && selection.service && (
        <div className="space-y-6">
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex justify-between items-center">
            <div>
              <div className="text-xs text-zinc-500">SELECTED PROTOCOL</div>
              <div className="font-bold">{selection.service.name}</div>
            </div>
            <div className="font-mono text-violet-400">${selection.service.price}</div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 bg-yellow-500/10 rounded"><Zap size={12} className="text-yellow-500" /></div>
              <div className="text-xs font-bold text-zinc-400 tracking-widest uppercase">Morning Ops</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['6:00 AM', '7:30 AM', '9:00 AM'].map((t) => (
                <button
                  key={t}
                  onClick={() => setSelection((prev) => ({ ...prev, time: t }))}
                  className={`py-3 px-2 rounded-xl border text-xs font-bold transition-all ${selection.time === t
                    ? 'bg-violet-600 border-violet-500 text-white shadow-lg scale-105'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-zinc-400'
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 bg-blue-500/10 rounded"><Zap size={12} className="text-blue-500" /></div>
              <div className="text-xs font-bold text-zinc-400 tracking-widest uppercase">Evening Ops</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['4:30 PM', '6:00 PM', '7:30 PM'].map((t) => (
                <button
                  key={t}
                  onClick={() => setSelection((prev) => ({ ...prev, time: t }))}
                  className={`py-3 px-2 rounded-xl border text-xs font-bold transition-all ${selection.time === t
                    ? 'bg-violet-600 border-violet-500 text-white shadow-lg scale-105'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-zinc-400'
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Next Booking from iCal */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-3 flex gap-3 items-start">
            <AlertCircle size={14} className="text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-400">
              <span className="font-bold text-zinc-300">Note: </span>
              Full online booking (Google Calendar event creation) coming soon. This logs your intent and awards XP now.
            </p>
          </div>

          <div className="pt-2">
            <button
              disabled={!selection.time}
              onClick={() => void handleBook()}
              className="w-full py-4 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} /> Confirm Booking
            </button>
            <p className="text-center text-[10px] text-zinc-600 mt-4">
              No charge until check-in. 12h cancellation policy applies.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
