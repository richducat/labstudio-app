'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Clock,
  Info,
  MapPin,
  Sparkles,
} from 'lucide-react';
import Card from '../components/Card';

const SERVICES = [
  { id: 'intro', name: 'Intro Assessment', price: 49, time: '45m', desc: 'Movement screen, baseline review, and training strategy.', type: 'Strategy' },
  { id: 'pt60', name: '1:1 Training Session', price: 95, time: '60m', desc: 'A guided strength or hypertrophy session built around your goals.', type: 'Strength' },
  { id: 'recovery', name: 'Recovery Session', price: 59, time: '30m', desc: 'Contrast therapy focused on recovery and down-regulation.', type: 'Recovery' },
  { id: 'mobility', name: 'Mobility Session', price: 55, time: '45m', desc: 'Active mobility work for joint health and movement quality.', type: 'Mobility' },
] as const;

const TIME_GROUPS = [
  { label: 'Morning', accent: 'text-yellow-500', slots: ['6:00 AM', '7:30 AM', '9:00 AM'] },
  { label: 'Evening', accent: 'text-blue-500', slots: ['4:30 PM', '6:00 PM', '7:30 PM'] },
] as const;

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const DEFAULT_LOCATION = '3280 Suntree Blvd, Melbourne, FL';

const BADGE_COLORS: Record<string, string> = {
  violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  blue: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

type Service = (typeof SERVICES)[number];

type BookingCalendarEvent = {
  summary: string;
  start: string;
  end: string;
  location: string | null;
  description: string | null;
  source?: 'google_calendar' | 'app';
};

type HomeStats = {
  latestStats?: { weight_lbs?: string | number | null } | null;
  progress?: { workouts7d?: { count: number } | null } | null;
  profile?: {
    goal?: string | null;
    activity_level?: string | null;
    schedule_days?: string[] | null;
  } | null;
  bookingCalendar?: BookingCalendarEvent[];
  calendarFeed?: {
    connected?: boolean;
    importedUpcomingCount?: number;
  } | null;
};

type BookingResponse = {
  ok?: boolean;
  error?: string;
  item?: {
    title?: string;
    time?: string | null;
    scheduledAt?: string | null;
    details?: {
      location?: string;
      description?: string;
    };
  } | null;
};

type DateOption = {
  value: string;
  label: string;
  shortLabel: string;
};

type BookedWindow = {
  startMin: number;
  endMin: number;
  event: BookingCalendarEvent;
};

function Badge({ children, color = 'violet' }: { children: ReactNode; color?: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${BADGE_COLORS[color] ?? BADGE_COLORS.violet}`}>
      {children}
    </span>
  );
}

function formatDayValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDateOptions(scheduleDays?: string[] | null): DateOption[] {
  const allowedDays = new Set((scheduleDays ?? []).map((day) => String(day).toLowerCase()).filter(Boolean));
  const options: DateOption[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  for (let offset = 1; offset <= 14 && options.length < 4; offset += 1) {
    const candidate = new Date(start);
    candidate.setDate(start.getDate() + offset);

    const weekday = WEEKDAY_KEYS[candidate.getDay()];
    if (allowedDays.size && !allowedDays.has(weekday)) continue;

    options.push({
      value: formatDayValue(candidate),
      label: candidate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      shortLabel: candidate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    });
  }

  if (options.length) return options;

  return Array.from({ length: 4 }, (_, index) => {
    const candidate = new Date(start);
    candidate.setDate(start.getDate() + index + 1);
    return {
      value: formatDayValue(candidate),
      label: candidate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      shortLabel: candidate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    };
  });
}

function getRecommendedService(goal: string | null | undefined, workouts7d: number) {
  const goalText = String(goal ?? '').toLowerCase();

  if (workouts7d === 0) return SERVICES.find((service) => service.id === 'intro') ?? SERVICES[0];
  if (goalText.includes('recover') || goalText.includes('sleep')) return SERVICES.find((service) => service.id === 'recovery') ?? SERVICES[0];
  if (goalText.includes('mobility') || goalText.includes('movement')) return SERVICES.find((service) => service.id === 'mobility') ?? SERVICES[0];
  return SERVICES.find((service) => service.id === 'pt60') ?? SERVICES[0];
}

function getRecommendationReason(goal: string | null | undefined, workouts7d: number, activityLevel: string | null | undefined) {
  const goalText = String(goal ?? '').trim();
  const cadenceText = workouts7d > 0 ? `${workouts7d} logged session${workouts7d === 1 ? '' : 's'} in the last 7 days` : 'no recent sessions logged yet';
  const intensityText = activityLevel ? `Your activity setting is ${activityLevel}.` : null;

  return [goalText ? `Primary goal: ${goalText}.` : null, `${cadenceText.charAt(0).toUpperCase()}${cadenceText.slice(1)}.`, intensityText]
    .filter(Boolean)
    .join(' ');
}

function getDurationMin(service: Service) {
  const minutes = Number.parseInt(service.time, 10);
  return Number.isFinite(minutes) ? minutes : 60;
}

function parseTimeLabelToMinutes(timeLabel: string) {
  const match = timeLabel.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) return 0;

  const hour12 = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  let hour24 = hour12 % 12;
  if (meridiem === 'PM') hour24 += 12;

  return hour24 * 60 + minute;
}

function getDatePartsInNY(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: Number(read('hour')),
    minute: Number(read('minute')),
  };
}

function getNyDateKey(date: Date) {
  const parts = getDatePartsInNY(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getNyMinutes(date: Date) {
  const parts = getDatePartsInNY(date);
  return parts.hour * 60 + parts.minute;
}

function formatNyTimeRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Time unavailable';

  const format = (date: Date) => date.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${format(start)} - ${format(end)}`;
}

function slotIsBlocked(windowsByDay: Map<string, BookedWindow[]>, day: string, timeLabel: string, durationMin: number) {
  const windows = windowsByDay.get(day) ?? [];
  const slotStart = parseTimeLabelToMinutes(timeLabel);
  const slotEnd = slotStart + durationMin;
  return windows.some((window) => slotStart < window.endMin && slotEnd > window.startMin);
}

export default function BookView() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selection, setSelection] = useState<{ service?: Service; time?: string; day?: string }>({});
  const [homeStats, setHomeStats] = useState<HomeStats | null>(null);
  const [saving, setSaving] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingResponse['item']>(null);

  useEffect(() => {
    fetch('/api/lab/home')
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) setHomeStats(data.home);
      })
      .catch(() => { });
  }, []);

  const lastWorkoutCount = homeStats?.progress?.workouts7d?.count ?? 0;
  const currentWeight = homeStats?.latestStats?.weight_lbs ?? null;
  const goal = homeStats?.profile?.goal ?? null;
  const activityLevel = homeStats?.profile?.activity_level ?? null;
  const dateOptions = useMemo(() => buildDateOptions(homeStats?.profile?.schedule_days), [homeStats?.profile?.schedule_days]);
  const recommended = useMemo(() => getRecommendedService(goal, lastWorkoutCount), [goal, lastWorkoutCount]);
  const others = useMemo(() => SERVICES.filter((service) => service.id !== recommended.id), [recommended.id]);
  const recommendationReason = useMemo(
    () => getRecommendationReason(goal, lastWorkoutCount, activityLevel),
    [activityLevel, goal, lastWorkoutCount]
  );

  useEffect(() => {
    if (!selection.day && dateOptions[0]) {
      setSelection((prev) => ({ ...prev, day: dateOptions[0].value }));
    }
  }, [dateOptions, selection.day]);

  const bookedWindowsByDay = useMemo(() => {
    const map = new Map<string, BookedWindow[]>();

    for (const event of homeStats?.bookingCalendar ?? []) {
      const start = new Date(event.start);
      const end = new Date(event.end);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

      const dayKey = getNyDateKey(start);
      const window: BookedWindow = {
        startMin: getNyMinutes(start),
        endMin: getNyMinutes(end),
        event,
      };

      const current = map.get(dayKey) ?? [];
      current.push(window);
      current.sort((a, b) => a.startMin - b.startMin);
      map.set(dayKey, current);
    }

    return map;
  }, [homeStats?.bookingCalendar]);

  useEffect(() => {
    if (!selection.day || !selection.time || !selection.service) return;
    if (slotIsBlocked(bookedWindowsByDay, selection.day, selection.time, getDurationMin(selection.service))) {
      setSelection((prev) => ({ ...prev, time: undefined }));
    }
  }, [selection.day, selection.time, selection.service, bookedWindowsByDay]);

  const selectedDay = dateOptions.find((option) => option.value === selection.day);
  const selectedDayWindows = useMemo(
    () => (selection.day ? bookedWindowsByDay.get(selection.day) ?? [] : []),
    [selection.day, bookedWindowsByDay]
  );

  const earliestAvailable = useMemo(() => {
    const durationMin = getDurationMin(recommended);

    for (const day of dateOptions) {
      for (const group of TIME_GROUPS) {
        for (const slot of group.slots) {
          if (!slotIsBlocked(bookedWindowsByDay, day.value, slot, durationMin)) {
            return { day: day.label, time: slot };
          }
        }
      }
    }

    return null;
  }, [dateOptions, recommended, bookedWindowsByDay]);

  const confirmationDay = booking?.scheduledAt
    ? new Date(booking.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    : selectedDay?.label ?? 'Scheduled';
  const confirmationTime = booking?.time ?? selection.time ?? 'Time pending';
  const confirmationLocation = booking?.details?.location ?? DEFAULT_LOCATION;

  const handleChooseService = (service: Service) => {
    setSelection((prev) => ({ ...prev, service, day: prev.day ?? dateOptions[0]?.value }));
    setBookingError(null);
    setStep(2);
  };

  const handleBook = async () => {
    if (!selection.service || !selection.time || !selection.day) return;

    setSaving(true);
    setBookingError(null);

    try {
      const res = await fetch('/api/lab/agenda', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          day: selection.day,
          timeLabel: selection.time,
          title: selection.service.name,
          type: 'Session',
          action: 'book',
          durationMin: getDurationMin(selection.service),
          details: {
            description: selection.service.desc,
            location: DEFAULT_LOCATION,
            price: selection.service.price,
            serviceId: selection.service.id,
          },
        }),
      });

      const data = (await res.json().catch(() => ({}))) as BookingResponse;
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Failed to save booking (${res.status})`);
      }

      setBooking(data.item ?? null);
      setStep(3);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save booking';
      setBookingError(message);
    } finally {
      setSaving(false);
    }
  };

  if (step === 3) {
    return (
      <div className="space-y-8 py-10 text-center">
        <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500 border border-green-500/20 shadow-[0_0_40px_-10px_rgba(34,197,94,0.4)]">
          <CheckCircle size={48} />
        </div>
        <div>
          <h2 className="mb-2 text-2xl font-black italic sm:text-3xl">Session booked.</h2>
          <p className="text-zinc-400">Your booking has been added to your schedule and dashboard.</p>
        </div>
        <div className="p-6 bg-zinc-900/50 backdrop-blur rounded-2xl border border-zinc-800 max-w-xs mx-auto text-sm text-left relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-violet-500" />
          <div className="text-xs font-bold text-zinc-500 mb-2 tracking-widest">SESSION DETAILS</div>
          <div className="font-black text-xl text-white mb-1">{booking?.title ?? selection.service?.name}</div>
          <div className="flex items-center gap-2 text-violet-400 font-mono mb-2">
            <CalendarDays size={14} />
            <span>{confirmationDay}</span>
          </div>
          <div className="flex items-center gap-2 text-violet-400 font-mono mb-4">
            <Clock size={14} />
            <span>{confirmationTime}</span>
          </div>
          <div className="pt-4 border-t border-white/5 flex items-center gap-2 text-zinc-400 text-xs">
            <MapPin size={12} /> {confirmationLocation}
          </div>
        </div>
        <button
          onClick={() => {
            setStep(1);
            setSelection({});
            setBooking(null);
            setBookingError(null);
          }}
          className="w-full py-3 px-6 rounded-xl font-bold bg-violet-600 text-white hover:bg-violet-500 transition"
        >
          Book Another Session
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black italic uppercase">Book a Session</h2>
        {step === 2 ? (
          <button onClick={() => setStep(1)} className="text-xs text-zinc-500 underline flex items-center gap-1">
            <ChevronRight className="rotate-180" size={12} /> Back
          </button>
        ) : null}
      </div>

      {step === 1 ? (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">
              <Sparkles size={14} /> Training Snapshot
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <div className="text-[10px] text-zinc-500 mb-1">GOAL</div>
                <div className="text-sm font-bold">{goal ?? 'Set in onboarding'}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 mb-1">SESSIONS (7D)</div>
                <div className="text-sm font-bold">{lastWorkoutCount}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 mb-1">WEIGHT</div>
                <div className="text-sm font-bold">{currentWeight != null ? `${currentWeight} lbs` : 'No log yet'}</div>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-xs text-zinc-500">
              <div>
                Shared calendar:{' '}
                <span className="text-zinc-300 font-bold">
                  {homeStats?.calendarFeed?.connected ? 'Google Calendar connected' : 'No external calendar connected'}
                </span>
                {homeStats?.calendarFeed?.connected ? ` (${homeStats?.calendarFeed?.importedUpcomingCount ?? 0} imported upcoming event${homeStats?.calendarFeed?.importedUpcomingCount === 1 ? '' : 's'})` : ''}
              </div>
              <div>
                Next open recommended slot:{' '}
                <span className="text-zinc-300 font-bold">
                  {earliestAvailable ? `${earliestAvailable.day} at ${earliestAvailable.time}` : 'No open slots found in the next 14 days'}
                </span>
              </div>
            </div>
          </div>

          {(homeStats?.bookingCalendar?.length ?? 0) > 0 ? (
            <Card className="p-4 bg-zinc-900/70 border-white/5">
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Upcoming Calendar Events</div>
              <div className="space-y-3">
                {(homeStats?.bookingCalendar ?? []).slice(0, 3).map((event) => (
                  <div key={`${event.summary}-${event.start}`} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div>
                      <div className="font-bold text-sm">{event.summary || 'Session'}</div>
                      <div className="text-xs text-zinc-500 mt-1">{formatNyTimeRange(event.start, event.end)}</div>
                    </div>
                    <div className={`shrink-0 text-[10px] font-black uppercase tracking-widest ${event.source === 'google_calendar' ? 'text-blue-400' : 'text-violet-400'}`}>
                      {event.source === 'google_calendar' ? 'Google' : 'Lab'}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">RECOMMENDED</div>
              <div className="h-px bg-zinc-800 flex-1" />
            </div>
            <Card
              onClick={() => handleChooseService(recommended)}
              className="cursor-pointer border-violet-500/40 bg-violet-900/10 hover:bg-violet-900/20 transition group active:scale-[0.98]"
            >
              <div className="absolute top-0 right-0 bg-violet-600 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg z-10">
                BEST FIT
              </div>
              <div className="p-4 pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-lg text-white">{recommended.name}</div>
                    <div className="flex gap-2 mt-1">
                      <Badge color="violet">{recommended.type}</Badge>
                      <span className="text-xs text-zinc-500 flex items-center gap-1"><Clock size={10} /> {recommended.time}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block font-mono text-white font-bold">${recommended.price}</span>
                  </div>
                </div>
                <div className="flex gap-2 items-start mt-3 bg-black/20 p-2 rounded-lg">
                  <Info size={14} className="text-violet-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-400 leading-tight">
                    <span className="text-violet-400 font-bold">Why this fits: </span>
                    {recommendationReason}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div>
            <div className="text-xs font-bold text-zinc-500 mb-3 tracking-widest uppercase">Other Session Options</div>
            <div className="space-y-3">
              {others.map((service) => (
                <Card
                  key={service.id}
                  onClick={() => handleChooseService(service)}
                  className="p-4 cursor-pointer hover:bg-zinc-800 transition group active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="font-bold text-lg">{service.name}</div>
                      <div className="flex gap-2 mt-1">
                        <Badge color="blue">{service.type}</Badge>
                        <span className="text-xs text-zinc-500 flex items-center gap-1"><Clock size={10} /> {service.time}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-2 max-w-[220px]">{service.desc}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block font-mono text-zinc-400 font-bold">${service.price}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 && selection.service ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-zinc-900/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs text-zinc-500">SELECTED SESSION</div>
              <div className="font-bold">{selection.service.name}</div>
              <div className="text-xs text-zinc-500 mt-1">{selection.service.desc}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-violet-400">${selection.service.price}</div>
              <div className="text-[10px] text-zinc-500">{selection.service.time}</div>
            </div>
          </div>

          <Card className="p-4 bg-zinc-900/70 border-white/5">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Calendar Integration</div>
            <div className="text-sm text-zinc-300">
              {homeStats?.calendarFeed?.connected
                ? `Google Calendar is connected. ${homeStats?.calendarFeed?.importedUpcomingCount ?? 0} upcoming shared events are blocking availability.`
                : 'No external calendar is connected, so only sessions booked in the app will block times.'}
            </div>
          </Card>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 bg-violet-500/10 rounded"><CalendarDays size={12} className="text-violet-400" /></div>
              <div className="text-xs font-bold text-zinc-400 tracking-widest uppercase">Pick a Day</div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {dateOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelection((prev) => ({ ...prev, day: option.value }))}
                  className={`py-3 px-3 rounded-xl border text-left transition-all ${selection.day === option.value
                    ? 'bg-violet-600 border-violet-500 text-white shadow-lg'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-zinc-400'
                    }`}
                >
                  <div className="text-xs font-bold">{option.shortLabel}</div>
                  <div className="text-[10px] uppercase tracking-widest opacity-70">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {TIME_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1 bg-zinc-800 rounded"><Clock size={12} className={group.accent} /></div>
                <div className="text-xs font-bold text-zinc-400 tracking-widest uppercase">{group.label}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {group.slots.map((slot) => {
                  const blocked = selection.day ? slotIsBlocked(bookedWindowsByDay, selection.day, slot, getDurationMin(selection.service!)) : false;
                  return (
                    <button
                      key={slot}
                      disabled={blocked}
                      onClick={() => setSelection((prev) => ({ ...prev, time: slot }))}
                      className={`py-3 px-2 rounded-xl border text-xs font-bold transition-all ${blocked
                        ? 'bg-zinc-950 border-zinc-900 text-zinc-700 cursor-not-allowed'
                        : selection.time === slot
                          ? 'bg-violet-600 border-violet-500 text-white shadow-lg scale-105'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-zinc-400'
                        }`}
                    >
                      <div>{slot}</div>
                      <div className="mt-1 text-[9px] uppercase tracking-widest">{blocked ? 'Busy' : 'Open'}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <Card className="p-4 bg-zinc-900/70 border-white/5">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
              {selectedDay ? `Busy on ${selectedDay.shortLabel}` : 'Busy Times'}
            </div>
            {selectedDayWindows.length ? (
              <div className="space-y-3">
                {selectedDayWindows.map((window) => (
                  <div key={`${window.event.summary}-${window.event.start}`} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div>
                      <div className="font-bold text-sm">{window.event.summary || 'Session'}</div>
                      <div className="text-xs text-zinc-500 mt-1">{formatNyTimeRange(window.event.start, window.event.end)}</div>
                    </div>
                    <div className={`shrink-0 text-[10px] font-black uppercase tracking-widest ${window.event.source === 'google_calendar' ? 'text-blue-400' : 'text-violet-400'}`}>
                      {window.event.source === 'google_calendar' ? 'Google' : 'Lab'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-zinc-500">No conflicting events loaded for this day.</div>
            )}
          </Card>

          <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-3 flex gap-3 items-start">
            <AlertCircle size={14} className="text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-400">
              <span className="font-bold text-zinc-300">Note: </span>
              Imported Google Calendar events and sessions booked in the app both block conflicting times. Bookings made here are not added to Google Calendar automatically.
            </p>
          </div>

          {bookingError ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {bookingError}
            </div>
          ) : null}

          <div className="pt-2">
            <button
              disabled={!selection.day || !selection.time || saving}
              onClick={() => void handleBook()}
              className="w-full py-4 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} /> {saving ? 'Saving...' : 'Confirm Booking'}
            </button>
            <p className="text-center text-[10px] text-zinc-600 mt-4">
              Availability reflects calendar conflicts before you book.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
