'use client';

import { useEffect, useMemo, useState, type ElementType } from 'react';
import {
  Activity,
  CalendarDays,
  Camera,
  CheckCircle,
  Clock3,
  Dumbbell,
  Flame,
  HeartPulse,
  Mail,
  Phone,
  Smartphone,
  Trash2,
  User,
} from 'lucide-react';
import Card from '../components/Card';

type WearableRecord = {
  connected?: boolean;
  last_sync?: string;
};

type Profile = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  goal?: string | null;
  activity_level?: string | null;
  schedule_days?: string[] | null;
  nutrition_rating?: number | null;
  injuries_json?: unknown;
  wearables_json?: Record<string, WearableRecord>;
  created_at?: string | null;
  updated_at?: string | null;
};

type HomeData = {
  nutrition?: { calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number } | null;
  latestStats?: { weight_lbs?: string | number | null; body_fat_pct?: string | number | null; resting_hr?: number | null } | null;
  nextBooking?: { summary?: string; start?: string; location?: string | null } | null;
  recentWorkouts?: Array<{ id: number; created_at: string; kind: string | null; duration_min: number | null; note: string | null }>;
  sessionLog?: { bookedUpcoming30d?: number; completed7d?: number; missedApprox30d?: number } | null;
  progress?: {
    photos30d?: number;
    calories7dAvg?: number;
    workouts7d?: { count: number; minutes: number } | null;
    latestPr?: { lift: string; value: number; unit: string; reps: number | null } | null;
  } | null;
};

function formatDateLabel(value?: string | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTimeLabel(value?: string | null) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

function normalizeInjuries(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/\n|,/g).map((entry) => entry.trim()).filter(Boolean);
  }
  return [];
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: ElementType;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <Card className="p-4 bg-zinc-900/70 border-white/5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">{label}</div>
        <Icon size={14} className="text-violet-400" />
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {helper ? <div className="mt-2 text-xs text-zinc-500">{helper}</div> : null}
    </Card>
  );
}

export default function ProfileView() {
  const [subTab, setSubTab] = useState<'overview' | 'metrics' | 'activity'>('overview');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/lab/profile').then(async (response) => ({
        response,
        data: (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; profile?: Profile | null },
      })),
      fetch('/api/lab/home').then(async (response) => ({
        response,
        data: (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; home?: HomeData | null },
      })),
    ])
      .then(([profileResult, homeResult]) => {
        if (!profileResult.response.ok || !profileResult.data.ok) {
          throw new Error(profileResult.data.error || `Failed to load profile (${profileResult.response.status})`);
        }
        if (!homeResult.response.ok || !homeResult.data.ok) {
          throw new Error(homeResult.data.error || `Failed to load home data (${homeResult.response.status})`);
        }
        setProfile(profileResult.data.profile ?? null);
        setHomeData(homeResult.data.home ?? null);
        setError(null);
      })
      .catch((loadError) => {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load profile';
        setError(message);
      });
  }, []);

  const name = useMemo(() => {
    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
    return fullName || 'Athlete';
  }, [profile?.first_name, profile?.last_name]);

  const injuries = useMemo(() => normalizeInjuries(profile?.injuries_json), [profile?.injuries_json]);
  const connectedDevices = useMemo(() => {
    const wearables = profile?.wearables_json ?? {};
    return Object.entries(wearables).filter(([, record]) => record?.connected);
  }, [profile?.wearables_json]);

  const workouts7d = homeData?.progress?.workouts7d?.count ?? 0;
  const workoutMinutes7d = homeData?.progress?.workouts7d?.minutes ?? 0;
  const weight = homeData?.latestStats?.weight_lbs;
  const bodyFat = homeData?.latestStats?.body_fat_pct;
  const restingHr = homeData?.latestStats?.resting_hr;
  const latestPr = homeData?.progress?.latestPr ?? null;

  async function deleteAccount() {
    if (deleting) return;

    const confirmed = window.confirm(
      'Delete your Lab Studio account and saved training data? This cannot be undone.'
    );
    if (!confirmed) return;

    setDeleting(true);
    setDeleteMessage(null);

    try {
      const response = await fetch('/api/lab/account', { method: 'DELETE' });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || `Account deletion failed (${response.status})`);
      }
      window.location.href = '/login';
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Account deletion failed';
      setDeleteMessage(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="pb-20 space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-violet-900/30 via-zinc-950 to-zinc-950 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center">
            <User size={34} className="text-zinc-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold leading-none sm:text-3xl">{name}</h2>
              <CheckCircle size={16} className="text-blue-500" fill="currentColor" />
            </div>
            <div className="text-sm text-zinc-400 mt-2">{profile?.goal ?? 'Goal not set yet'}</div>
            <div className="text-xs text-zinc-500 mt-3">
              Member since {formatDateLabel(profile?.created_at)}. Last updated {formatDateLabel(profile?.updated_at)}.
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard icon={Dumbbell} label="Workouts 7D" value={String(workouts7d)} helper={`${workoutMinutes7d} total minutes`} />
          <StatCard icon={Activity} label="Weight" value={weight != null ? `${weight} lb` : 'No log'} helper="Most recent check-in" />
          <StatCard icon={HeartPulse} label="Body Fat" value={bodyFat != null ? `${bodyFat}%` : 'No log'} helper="Most recent check-in" />
          <StatCard icon={Clock3} label="Resting HR" value={restingHr != null ? `${restingHr} bpm` : 'No log'} helper="Most recent check-in" />
        </div>
      </div>

      {error ? (
        <Card className="p-4 bg-rose-500/10 border-rose-500/20 text-sm text-rose-200">
          {error}
        </Card>
      ) : null}

      <div className="flex border-b border-white/10">
        {(['overview', 'metrics', 'activity'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${subTab === tab ? 'border-violet-500 text-white' : 'border-transparent text-zinc-600 hover:text-zinc-400'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {subTab === 'overview' ? (
        <div className="space-y-4">
          <Card className="p-4 bg-zinc-900/70 border-white/5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3">Profile Setup</div>
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <div className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Activity Level</div>
                <div className="font-bold">{profile?.activity_level ?? 'Not set'}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Nutrition Rating</div>
                <div className="font-bold">{profile?.nutrition_rating != null ? `${profile.nutrition_rating}/10` : 'Not set'}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Preferred Days</div>
                <div className="font-bold">
                  {profile?.schedule_days?.length ? profile.schedule_days.join(', ') : 'No preferred training days saved'}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-zinc-900/70 border-white/5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3">Contact</div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-zinc-300">
                <Mail size={14} className="text-zinc-500" />
                <span>{profile?.email ?? 'No email on file'}</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <Phone size={14} className="text-zinc-500" />
                <span>{profile?.phone ?? 'No phone on file'}</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-zinc-900/70 border-white/5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3">Wearables</div>
            {connectedDevices.length ? (
              <div className="space-y-3">
                {connectedDevices.map(([key, record]) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                      <Smartphone size={14} className="text-zinc-500" />
                      <span>{key}</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-emerald-400">
                      {record.last_sync ? `Last sync ${formatDateLabel(record.last_sync)}` : 'Connected'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-zinc-500">No connected devices yet.</div>
            )}
          </Card>

          <Card className="p-4 bg-zinc-900/70 border-white/5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3">Injuries / Constraints</div>
            {injuries.length ? (
              <div className="flex flex-wrap gap-2">
                {injuries.map((injury) => (
                  <span key={injury} className="px-3 py-1 rounded-lg bg-zinc-800 border border-white/5 text-xs text-zinc-300">
                    {injury}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-zinc-500">No injuries or constraints recorded.</div>
            )}
          </Card>

          <Card className="p-4 bg-zinc-900/70 border-white/5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3">Support & Legal</div>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
              <a className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 font-bold text-zinc-200 transition hover:border-violet-400/40 hover:text-white" href="/support">
                Support
              </a>
              <a className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 font-bold text-zinc-200 transition hover:border-violet-400/40 hover:text-white" href="/privacy">
                Privacy
              </a>
              <a className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 font-bold text-zinc-200 transition hover:border-violet-400/40 hover:text-white" href="/terms">
                Terms
              </a>
            </div>
          </Card>

          <Card className="p-4 bg-zinc-900/70 border-rose-500/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-rose-300 mb-2">Account</div>
                <div className="text-sm text-zinc-400">
                  Delete your member account and saved Lab Studio training data.
                </div>
                {deleteMessage ? <div className="mt-2 text-xs text-rose-200">{deleteMessage}</div> : null}
              </div>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={14} />
                {deleting ? 'Deleting' : 'Delete Account'}
              </button>
            </div>
          </Card>
        </div>
      ) : null}

      {subTab === 'metrics' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatCard icon={Flame} label="Calories Today" value={homeData?.nutrition?.calories != null ? String(Math.round(homeData.nutrition.calories)) : '0'} helper="From your nutrition log" />
            <StatCard icon={Activity} label="Protein Today" value={homeData?.nutrition?.protein_g != null ? `${Math.round(homeData.nutrition.protein_g)}g` : '0g'} helper="From your nutrition log" />
            <StatCard icon={Camera} label="Photos 30D" value={String(homeData?.progress?.photos30d ?? 0)} helper="Progress photo check-ins" />
            <StatCard icon={Flame} label="Calories Avg 7D" value={String(homeData?.progress?.calories7dAvg ?? 0)} helper="Average daily intake" />
          </div>

          <Card className="p-4 bg-zinc-900/70 border-white/5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3">Latest PR</div>
            {latestPr ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xl font-semibold">{latestPr.lift}</div>
                  <div className="text-sm text-zinc-500">Logged from the strength tracker.</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold text-violet-400">
                    {latestPr.value} {latestPr.unit}
                  </div>
                  <div className="text-xs text-zinc-500">{latestPr.reps ? `${latestPr.reps} reps` : 'Single effort'}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-zinc-500">No PR logged yet.</div>
            )}
          </Card>

          <Card className="p-4 bg-zinc-900/70 border-white/5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3">Next Booking</div>
            {homeData?.nextBooking?.start ? (
              <div className="space-y-2">
                <div className="font-bold text-lg">{homeData.nextBooking.summary ?? 'Upcoming session'}</div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <CalendarDays size={14} className="text-violet-400" />
                  <span>{formatDateTimeLabel(homeData.nextBooking.start)}</span>
                </div>
                {homeData.nextBooking.location ? (
                  <div className="text-xs text-zinc-500">{homeData.nextBooking.location}</div>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-zinc-500">No upcoming session saved yet.</div>
            )}
          </Card>
        </div>
      ) : null}

      {subTab === 'activity' ? (
        <div className="space-y-4">
          <Card className="p-4 bg-zinc-900/70 border-white/5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3">Session Log</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Booked 30D</div>
                <div className="text-xl font-semibold">{homeData?.sessionLog?.bookedUpcoming30d ?? 0}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Completed 7D</div>
                <div className="text-xl font-semibold">{homeData?.sessionLog?.completed7d ?? 0}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Missed 30D</div>
                <div className="text-xl font-semibold">{homeData?.sessionLog?.missedApprox30d ?? 0}</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-zinc-900/70 border-white/5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3">Recent Workouts</div>
            {homeData?.recentWorkouts?.length ? (
              <div className="space-y-3">
                {homeData.recentWorkouts.map((workout) => (
                  <div key={workout.id} className="flex items-start justify-between gap-4 border-b border-white/5 pb-3 last:border-b-0 last:pb-0">
                    <div>
                      <div className="font-bold">{workout.kind ?? 'Workout'}</div>
                      <div className="text-xs text-zinc-500 mt-1">{formatDateTimeLabel(workout.created_at)}</div>
                      {workout.note ? <div className="text-xs text-zinc-400 mt-2">{workout.note}</div> : null}
                    </div>
                    <div className="text-xs uppercase tracking-widest text-violet-400 shrink-0">
                      {workout.duration_min ? `${workout.duration_min} min` : 'Logged'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-zinc-500">No workouts have been logged in the last 7 days.</div>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
