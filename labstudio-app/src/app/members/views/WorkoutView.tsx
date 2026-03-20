'use client';

import { useEffect, useState } from 'react';
import {
  CheckSquare,
  Dumbbell,
  Timer,
  Video,
  X,
  Zap,
} from 'lucide-react';
import Card from '../components/Card';

const WORKOUT_TEMPLATE = {
  name: 'Upper Body Hypertrophy',
  exercises: [
    { id: 1, name: 'DB Incline Press', sets: 3, reps: '8-12', weight: '60lbs' },
    { id: 2, name: 'Pull-Ups (Weighted)', sets: 3, reps: 'Failure', weight: 'BW+25' },
    { id: 3, name: 'Lateral Raises', sets: 4, reps: '15-20', weight: '25lbs' },
    { id: 4, name: 'Tricep Pushdowns', sets: 3, reps: '12-15', weight: 'Stack' },
  ],
};

const PROGRAMS = [
  { id: 'regular', title: 'Strength Session', desc: 'Track sets, rest periods, and personal bests.', icon: Dumbbell },
  { id: 'circuit', title: 'Circuit Session', desc: 'Move station to station with guided timers.', icon: Zap },
  { id: 'interval', title: 'Interval Timer', desc: 'Use simple timers to stay on pace.', icon: Timer },
  { id: 'video', title: 'Guided Video', desc: 'Follow a workout with coaching cues.', icon: Video },
];

function getApiErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === 'string') return error;
  }
  return fallback;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

function WorkoutSessionView({ onDone }: { onDone: () => void }) {
  const [activeExercise, setActiveExercise] = useState(0);
  const [sets, setSets] = useState<Record<string, boolean>>({});
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!timerActive) return;
    if (timer <= 0) {
      // Use a timeout of 0 to defer the state update outside the effect body
      const id = setTimeout(() => setTimerActive(false), 0);
      return () => clearTimeout(id);
    }
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timerActive, timer]);

  const toggleSet = (exIdx: number, setIdx: number) => {
    const key = `${exIdx}-${setIdx}`;
    const wasChecked = sets[key];
    setSets((prev) => ({ ...prev, [key]: !prev[key] }));
    if (!wasChecked) {
      setTimer(90);
      setTimerActive(true);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const totalSets = Object.values(sets).filter(Boolean).length;
      await fetch('/api/lab/workouts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'workout',
          durationMin: '45',
          note: `${WORKOUT_TEMPLATE.name} – ${totalSets} sets completed`,
        }),
      });
    } catch { /* ignore */ }
    setSaving(false);
    onDone();
  };

  return (
    <div className="flex flex-col min-h-[80vh]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-black italic uppercase">{WORKOUT_TEMPLATE.name}</h2>
        <button onClick={onDone} className="p-2 bg-zinc-900 rounded-full"><X size={20} /></button>
      </div>

      <div className="flex-1 space-y-4 pb-36">
        {WORKOUT_TEMPLATE.exercises.map((ex, i) => (
          <div
            key={ex.id}
            className={`p-4 rounded-2xl border transition-colors ${i === activeExercise
              ? 'bg-zinc-800 border-violet-500/50'
              : 'bg-zinc-900/50 border-white/5'
              }`}
          >
            <div className="flex justify-between mb-3 cursor-pointer" onClick={() => setActiveExercise(i)}>
              <div>
                <div className="font-bold text-lg">{ex.name}</div>
                <div className="text-xs text-zinc-500">{ex.sets} Sets • {ex.reps} Reps</div>
              </div>
              <div className="font-mono font-bold text-violet-400">{ex.weight}</div>
            </div>

            {i === activeExercise && (
              <div className="space-y-2">
                {Array.from({ length: ex.sets }).map((_, s) => {
                  const key = `${i}-${s}`;
                  const done = !!sets[key];
                  return (
                    <div key={s} className="flex items-center justify-between bg-zinc-950 p-2 rounded-lg border border-white/5">
                      <div className="text-xs font-bold text-zinc-500">SET {s + 1}</div>
                      <div className="font-mono text-sm text-zinc-300">Target: {ex.reps}</div>
                      <button
                        onClick={() => toggleSet(i, s)}
                        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${done ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}
                      >
                        <CheckSquare size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-20 left-0 right-0 p-4 max-w-md mx-auto space-y-2">
        {timerActive && (
          <div className="bg-zinc-900 border border-violet-500/50 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-violet-400 font-bold">
              <Timer size={18} /> REST
            </div>
            <div className="font-mono text-xl font-bold">{formatTime(timer)}</div>
            <button onClick={() => { setTimerActive(false); setTimer(0); }} className="text-xs bg-zinc-800 px-2 py-1 rounded">
              SKIP
            </button>
          </div>
        )}
        <button
          onClick={() => void handleFinish()}
          disabled={saving}
          className="w-full py-4 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition"
        >
          {saving ? 'Saving…' : 'COMPLETE SESSION'}
        </button>
      </div>
    </div>
  );
}

export default function WorkoutView({ onSelect }: { onSelect: (id: string) => void }) {
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [workoutLog, setWorkoutLog] = useState({ kind: 'workout', durationMin: '', note: '' });
  const [pr, setPr] = useState({ lift: '', value: '', unit: 'lb', reps: '' });

  if (activeMode === 'regular') {
    return <WorkoutSessionView onDone={() => setActiveMode(null)} />;
  }

  const saveWorkout = async () => {
    try {
      const res = await fetch('/api/lab/workouts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(workoutLog),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(getApiErrorMessage(json, 'Failed to save workout'));
      }
      setWorkoutLog({ kind: 'workout', durationMin: '', note: '' });
      alert('Workout saved!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save workout');
    }
  };

  const savePr = async () => {
    try {
      const res = await fetch('/api/lab/strength-prs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(pr),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(getApiErrorMessage(json, 'Failed to save PR'));
      }
      setPr({ lift: '', value: '', unit: 'lb', reps: '' });
      alert('PR saved!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save PR');
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="px-1">
        <h1 className="text-2xl font-black italic uppercase">Workout</h1>
        <div className="text-xs text-zinc-500">Choose how you want to train today.</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PROGRAMS.map((p) => {
          const Icon = p.icon;
          return (
            <Card
              key={p.id}
              className="p-4 hover:bg-zinc-800 transition cursor-pointer"
              onClick={() => {
                if (p.id === 'regular') { setActiveMode('regular'); return; }
                onSelect(p.id);
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-violet-400">
                  <Icon size={18} />
                </div>
                <div className="flex-1">
                  <div className="font-bold">{p.title}</div>
                  <div className="text-xs text-zinc-500 mt-1">{p.desc}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Log */}
      <Card className="p-4 space-y-3">
        <div className="font-bold">Quick workout log</div>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={workoutLog.kind}
            onChange={(e) => setWorkoutLog({ ...workoutLog, kind: e.target.value })}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm"
            placeholder="Type (workout/cardio)"
          />
          <input
            value={workoutLog.durationMin}
            onChange={(e) => setWorkoutLog({ ...workoutLog, durationMin: e.target.value })}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm"
            placeholder="Duration (min)"
          />
        </div>
        <textarea
          value={workoutLog.note}
          onChange={(e) => setWorkoutLog({ ...workoutLog, note: e.target.value })}
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm h-16 resize-none w-full"
          placeholder="Notes (optional)"
        />
        <div className="flex justify-end">
          <button onClick={() => void saveWorkout()} className="text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 rounded-full">
            Save Workout
          </button>
        </div>
      </Card>

      {/* PR Logger */}
      <Card className="p-4 space-y-3">
        <div className="font-bold">Log a strength PR</div>
        <div className="grid grid-cols-2 gap-2">
          <input value={pr.lift} onChange={(e) => setPr({ ...pr, lift: e.target.value })} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm col-span-2" placeholder="Lift (e.g., Bench Press)" />
          <input value={pr.value} onChange={(e) => setPr({ ...pr, value: e.target.value })} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm" placeholder="Value" />
          <input value={pr.unit} onChange={(e) => setPr({ ...pr, unit: e.target.value })} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm" placeholder="Unit (lb/kg)" />
          <input value={pr.reps} onChange={(e) => setPr({ ...pr, reps: e.target.value })} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm col-span-2" placeholder="Reps (optional)" />
        </div>
        <div className="flex justify-end">
          <button onClick={() => void savePr()} className="text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 px-3 py-1.5 rounded-full">
            Save PR
          </button>
        </div>
      </Card>
    </div>
  );
}
