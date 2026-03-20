import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dbConfigured, ensureSchema, getOrCreateUser, getUserProfile } from '@/lib/db';
import { neon } from '@neondatabase/serverless';
import * as ical from 'ical';

export const runtime = 'nodejs';

function todayInNY(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function sql() {
  const url = process.env.DATABASE_URL || '';
  if (!url) throw new Error('DATABASE_URL not configured');
  return neon(url);
}

async function fetchIcalEvents() {
  const icalUrl = process.env.LABSTUDIO_BOOKINGS_ICAL_URL;
  if (!icalUrl) return [];

  const res = await fetch(icalUrl, {
    headers: {
      'user-agent': 'labstudio-app/1.0',
      accept: 'text/calendar,*/*',
    },
    cache: 'no-store',
  });
  if (!res.ok) return [];

  const icsText = await res.text();
  const data = ical.parseICS(icsText) as Record<string, { type?: string; summary?: string; start?: string | Date; end?: string | Date; location?: string; description?: string }>;

  const events = Object.values(data || {}).filter((v) => v && v.type === 'VEVENT');
  return events
    .map((e) => ({
      summary: String(e.summary ?? ''),
      start: e.start ? new Date(e.start) : null,
      end: e.end ? new Date(e.end) : null,
      location: e.location ? String(e.location) : null,
      description: e.description ? String(e.description) : null,
    }))
    .filter((e) => e.start && e.end);
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length ? value.trim() : null;
}

export async function GET() {
  if (!dbConfigured()) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL not configured' }, { status: 400 });
  }

  const jar = await cookies();
  const uid = jar.get('labstudio_uid')?.value;
  if (!uid) {
    return NextResponse.json({ ok: false, error: 'Missing labstudio_uid cookie' }, { status: 401 });
  }

  await ensureSchema();
  await getOrCreateUser(uid);

  const q = sql();
  const profile = await getUserProfile(uid);

  // Latest daily stats
  const stats = (await q`
    select id, created_at, weight_lbs, body_fat_pct, resting_hr, note
    from lab_daily_stats
    where user_id = ${uid}
    order by created_at desc
    limit 1;
  `) as { id: number; created_at: Date; weight_lbs: number | null; body_fat_pct: number | null; resting_hr: number | null; note: string | null }[];

  // Today's nutrition totals (America/New_York)
  const nutrition = (await q`
    select
      coalesce(sum(protein_g), 0) as protein_g,
      coalesce(sum(carbs_g), 0) as carbs_g,
      coalesce(sum(fat_g), 0) as fat_g
    from lab_nutrition_log
    where user_id = ${uid}
      and (created_at at time zone 'America/New_York')::date = (now() at time zone 'America/New_York')::date;
  `) as { protein_g: number; carbs_g: number; fat_g: number }[];

  const n = nutrition?.[0] ?? { protein_g: 0, carbs_g: 0, fat_g: 0 };
  const cals = Number(n.protein_g) * 4 + Number(n.carbs_g) * 4 + Number(n.fat_g) * 9;

  // Workout summary (last 7d)
  const workouts7d = (await q`
    select
      count(*)::int as completed,
      coalesce(sum(duration_min), 0)::int as minutes
    from lab_workout_log
    where user_id = ${uid}
      and created_at >= (now() - interval '7 days');
  `) as { completed: number; minutes: number }[];

  // Progress photos count (last 30d)
  const photos30d = (await q`
    select count(*)::int as count
    from lab_progress_photos
    where user_id = ${uid}
      and created_at >= (now() - interval '30 days');
  `) as { count: number }[];

  // Nutrition 7d avg calories (America/New_York)
  const nutrition7d = (await q`
    select
      (coalesce(sum(protein_g), 0) * 4 + coalesce(sum(carbs_g), 0) * 4 + coalesce(sum(fat_g), 0) * 9) as calories
    from lab_nutrition_log
    where user_id = ${uid}
      and (created_at at time zone 'America/New_York')::date >= ((now() at time zone 'America/New_York')::date - 6);
  `) as { calories: number }[];

  // Latest PR
  const latestPr = (await q`
    select id, created_at, lift, value, unit, reps
    from lab_strength_prs
    where user_id = ${uid}
    order by created_at desc
    limit 1;
  `) as { id: number; created_at: Date; lift: string; value: number; unit: string; reps: number }[];

  // External iCal sessions + in-app bookings
  const icsEvents = await fetchIcalEvents();
  const now = new Date();
  const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const appBookings = (await q`
    select id, title, scheduled_at, duration_min, details_json
    from lab_agenda_items
    where user_id = ${uid}
      and action = 'book'
      and scheduled_at is not null
      and scheduled_at > now()
      and scheduled_at < (now() + interval '30 days')
    order by scheduled_at asc;
  `) as Array<{
    id: string;
    title: string;
    scheduled_at: Date | null;
    duration_min: number | null;
    details_json: Record<string, unknown> | null;
  }>;

  const iCalUpcoming = icsEvents
    .filter((e) => e.start && e.start > now && e.start < in30d)
    .sort((a, b) => a.start!.getTime() - b.start!.getTime())
    .map((event) => ({
      ...event,
      source: 'google_calendar' as const,
      description: event.description ?? 'Imported from the shared Google Calendar feed.',
    }));
  const bookedPast30d = icsEvents.filter((e) => e.start && e.start < now && e.start > last30d).length;

  const plannedUpcoming = appBookings
    .filter((booking) => booking.scheduled_at)
    .map((booking) => {
      const start = booking.scheduled_at as Date;
      const durationMin = Number(booking.duration_min ?? 60) || 60;
      const end = new Date(start.getTime() + durationMin * 60 * 1000);
      const details = booking.details_json ?? {};
      return {
        summary: booking.title,
        start,
        end,
        location: textOrNull(details.location),
        description: textOrNull(details.description) ?? 'Saved from the in-app booking planner.',
        source: 'app' as const,
      };
    });

  const bookedUpcoming30d = iCalUpcoming.length + plannedUpcoming.length;

  const completed7d = Number(workouts7d?.[0]?.completed ?? 0);
  const workoutMinutes7d = Number(workouts7d?.[0]?.minutes ?? 0);
  const missedApprox30d = Math.max(bookedPast30d - completed7d, 0);

  const combinedUpcomingBookings = [...iCalUpcoming, ...plannedUpcoming]
    .sort((a, b) => a.start!.getTime() - b.start!.getTime())
  const in14d = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const bookingCalendar = combinedUpcomingBookings
    .filter((booking) => booking.start && booking.start < in14d)
    .slice(0, 50);
  const upcomingBookings = combinedUpcomingBookings.slice(0, 5);
  const nextBooking = upcomingBookings[0] ?? null;

  const recentWorkouts = (await q`
    select id, created_at, kind, duration_min, note
    from lab_workout_log
    where user_id = ${uid}
      and created_at >= (now() - interval '7 days')
    order by created_at desc
    limit 10;
  `) as { id: number; created_at: Date; kind: string; duration_min: number; note: string | null }[];

  const calories7dTotal = Number(nutrition7d?.[0]?.calories ?? 0);
  const calories7dAvg = Math.round(calories7dTotal / 7);

  // Agenda (derived from real logs + optional planned items)
  const day = todayInNY();

  const [dailyStatsCount, progressPhotoCount, nutritionCount] = await Promise.all([
    q`select count(*)::int as count
      from lab_daily_stats
      where user_id = ${uid}
        and (created_at at time zone 'America/New_York')::date = ${day}::date;`,
    q`select count(*)::int as count
      from lab_progress_photos
      where user_id = ${uid}
        and (created_at at time zone 'America/New_York')::date = ${day}::date;`,
    q`select count(*)::int as count
      from lab_nutrition_log
      where user_id = ${uid}
        and (created_at at time zone 'America/New_York')::date = ${day}::date;`,
  ]);

  const habits = (await q`
    select
      h.id,
      h.name,
      h.sort_order,
      (hc.id is not null) as checked
    from lab_habits h
    left join lab_habit_checkins hc
      on hc.habit_id = h.id
      and hc.user_id = h.user_id
      and hc.day = ${day}::date
    where h.user_id = ${uid}
      and h.active = true
    order by h.sort_order asc, h.created_at asc;
  `) as { id: string; name: string; sort_order: number; checked: boolean }[];

  const plannedAgenda = (await q`
    select id, time_label, title, type, action, sort_order, completed_at
    from lab_agenda_items
    where user_id = ${uid}
      and day = ${day}::date
    order by sort_order asc, created_at asc;
  `) as { id: string; time_label: string | null; title: string; type: string; action: string; sort_order: number; completed_at: Date | null }[];

  const agenda: Array<{ id: string; title: string; time: string | null; type: string; action: string; completed: boolean }> = [];

  agenda.push({
    id: 'auto:daily-stats',
    title: 'Daily stats check-in',
    time: null,
    type: 'Check-in',
    action: 'quicklog',
    completed: Number(dailyStatsCount?.[0]?.count ?? 0) > 0,
  });
  agenda.push({
    id: 'auto:progress-photo',
    title: 'Progress photo',
    time: null,
    type: 'Check-in',
    action: 'progress_photos',
    completed: Number(progressPhotoCount?.[0]?.count ?? 0) > 0,
  });
  agenda.push({
    id: 'auto:nutrition',
    title: 'Log nutrition',
    time: null,
    type: 'Habit',
    action: 'nutrition',
    completed: Number(nutritionCount?.[0]?.count ?? 0) > 0,
  });

  for (const h of habits) {
    agenda.push({
      id: `habit:${h.id}`,
      title: h.name,
      time: null,
      type: 'Habit',
      action: 'habits',
      completed: Boolean(h.checked),
    });
  }

  for (const p of plannedAgenda) {
    agenda.push({
      id: `planned:${p.id}`,
      title: p.title,
      time: p.time_label ?? null,
      type: String(p.type ?? 'Task'),
      action: String(p.action ?? 'home'),
      completed: Boolean(p.completed_at),
    });
  }

  return NextResponse.json({
    ok: true,
    home: {
      profile,
      nutrition: { protein_g: Number(n.protein_g), carbs_g: Number(n.carbs_g), fat_g: Number(n.fat_g), calories: cals },
      latestStats: stats?.[0] ?? null,
      nextBooking,
      upcomingBookings,
      bookingCalendar,
      calendarFeed: {
        connected: Boolean(process.env.LABSTUDIO_BOOKINGS_ICAL_URL),
        importedUpcomingCount: iCalUpcoming.length,
      },
      recentWorkouts,
      agenda,
      sessionLog: {
        bookedUpcoming30d,
        completed7d,
        missedApprox30d,
      },
      progress: {
        photos30d: Number(photos30d?.[0]?.count ?? 0),
        calories7dAvg,
        workouts7d: { count: completed7d, minutes: workoutMinutes7d },
        latestPr: latestPr?.[0] ?? null,
      },
    },
  });
}
