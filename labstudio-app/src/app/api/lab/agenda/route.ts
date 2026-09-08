import { getAuthenticatedUserId } from '@/lib/authenticated-user';
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import * as ical from 'ical';
import { dbConfigured, ensureSchema, getOrCreateUser } from '@/lib/db';

export const runtime = 'nodejs';

function sql() {
  const url = process.env.DATABASE_URL || '';
  if (!url) throw new Error('DATABASE_URL not configured');
  return neon(url);
}

function todayInNY(): string {
  // Treat “today” as America/New_York for consistency with other home widgets.
  // en-CA yields YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function fetchIcalEvents() {
  const icalUrl = process.env.LABSTUDIO_BOOKINGS_ICAL_URL;
  if (!icalUrl) return [];

  try {
    const res = await fetch(icalUrl, {
      headers: {
        'user-agent': 'labstudio-app/1.0',
        accept: 'text/calendar,*/*',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];

    const icsText = await res.text();
    const data = ical.parseICS(icsText) as Record<string, { type?: string; start?: string | Date; end?: string | Date }>;

    return Object.values(data || {})
      .filter((entry) => entry && entry.type === 'VEVENT')
      .map((entry) => ({
        start: toDate(entry.start),
        end: toDate(entry.end),
      }))
      .filter((entry): entry is { start: Date; end: Date } => Boolean(entry.start && entry.end));
  } catch (error) {
    console.error('Booking availability feed unavailable:', error instanceof Error ? error.message : 'unknown error');
    return [];
  }
}

function normalizeDateInput(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function normalizeTimeLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toUpperCase();
  return /^(1[0-2]|[1-9]):[0-5][0-9]\s?(AM|PM)$/.test(trimmed) ? trimmed.replace(/\s+/, ' ') : null;
}

function to24HourTime(timeLabel: string): string {
  const match = timeLabel.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) return '00:00:00';

  const hour12 = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  let hour24 = hour12 % 12;
  if (meridiem === 'PM') hour24 += 12;

  return `${String(hour24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

function normalizeText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeDuration(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 60;
  return Math.min(240, Math.max(15, Math.round(parsed)));
}

function normalizeDetailsJson(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

type DatabaseDate = Date | string;

type PlannedAgendaRow = {
  id: string;
  day: DatabaseDate;
  time_label: string | null;
  scheduled_at: DatabaseDate | null;
  duration_min: number | null;
  title: string;
  type: string;
  action: string;
  sort_order: number;
  details_json: Record<string, unknown> | null;
  completed_at: DatabaseDate | null;
};

function toDate(value: unknown): Date | null {
  if (!(value instanceof Date) && typeof value !== 'string') return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toISOString(value: unknown): string | null {
  return toDate(value)?.toISOString() ?? null;
}

function serializeAgendaRow(row: PlannedAgendaRow) {
  return {
    id: String(row.id),
    day: toISOString(row.day) ?? String(row.day),
    time: row.time_label ?? null,
    title: row.title,
    type: row.type,
    action: row.action,
    completed: Boolean(row.completed_at),
    scheduledAt: toISOString(row.scheduled_at),
    durationMin: row.duration_min ?? null,
    details: row.details_json ?? {},
  };
}

export async function GET() {
  if (!dbConfigured()) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL not configured' }, { status: 400 });
  }

  const uid = await getAuthenticatedUserId();
  if (!uid) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  await ensureSchema();
  await getOrCreateUser(uid);

  const q = sql();

  const day = todayInNY();

  // “Auto” agenda items based on real logs.
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

  const planned = (await q`
    select id, day, time_label, scheduled_at, duration_min, title, type, action, sort_order, details_json, completed_at
    from lab_agenda_items
    where user_id = ${uid}
      and day = ${day}::date
    order by sort_order asc, created_at asc;
  `) as PlannedAgendaRow[];

  const items: { id: string; title: string; time: string | null; type: string; action: string; completed: boolean }[] = [];

  items.push({
    id: 'auto:daily-stats',
    title: 'Daily stats check-in',
    time: null,
    type: 'Check-in',
    action: 'quicklog',
    completed: Number(dailyStatsCount?.[0]?.count ?? 0) > 0,
  });

  items.push({
    id: 'auto:progress-photo',
    title: 'Progress photo',
    time: null,
    type: 'Check-in',
    action: 'progress_photos',
    completed: Number(progressPhotoCount?.[0]?.count ?? 0) > 0,
  });

  items.push({
    id: 'auto:nutrition',
    title: 'Log nutrition',
    time: null,
    type: 'Habit',
    action: 'nutrition',
    completed: Number(nutritionCount?.[0]?.count ?? 0) > 0,
  });

  for (const h of habits) {
    items.push({
      id: `habit:${h.id}`,
      title: h.name,
      time: null,
      type: 'Habit',
      action: 'habits',
      completed: Boolean(h.checked),
    });
  }

  for (const p of planned) {
    items.push({
      id: `planned:${p.id}`,
      title: p.title,
      time: p.time_label ?? null,
      type: p.type,
      action: p.action,
      completed: Boolean(p.completed_at),
    });
  }

  return NextResponse.json({
    ok: true,
    day: 'today',
    items,
    planned: planned.map(serializeAgendaRow),
  });
}

export async function POST(req: Request) {
  if (!dbConfigured()) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL not configured' }, { status: 400 });
  }

  const uid = await getAuthenticatedUserId();
  if (!uid) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const day = normalizeDateInput(body.day);
  const timeLabel = normalizeTimeLabel(body.timeLabel);
  const title = normalizeText(body.title);
  const type = normalizeText(body.type, 'Session') || 'Session';
  const action = normalizeText(body.action, 'book') || 'book';
  const durationMin = normalizeDuration(body.durationMin);
  const details = normalizeDetailsJson(body.details);

  if (!day || !timeLabel || !title) {
    return NextResponse.json({ ok: false, error: 'day, timeLabel, and title are required' }, { status: 400 });
  }

  await ensureSchema();
  await getOrCreateUser(uid);

  const q = sql();
  const time24 = to24HourTime(timeLabel);
  const [hourPart, minutePart] = time24.split(':').map((part) => Number(part));
  const sortOrder = Number.isFinite(Number(body.sortOrder))
    ? Math.max(0, Math.floor(Number(body.sortOrder)))
    : hourPart * 60 + minutePart;

  const requestedWindow = (await q`
    select
      ((${day}::date + ${time24}::time) at time zone 'America/New_York') as start_at,
      ((((${day}::date + ${time24}::time) at time zone 'America/New_York')) + (${durationMin} * interval '1 minute')) as end_at;
  `) as Array<{ start_at: DatabaseDate; end_at: DatabaseDate }>;

  const requestedStart = toDate(requestedWindow[0]?.start_at);
  const requestedEnd = toDate(requestedWindow[0]?.end_at);
  if (!requestedStart || !requestedEnd) {
    return NextResponse.json({ ok: false, error: 'Failed to calculate booking window' }, { status: 500 });
  }

  if (requestedStart.getTime() <= Date.now()) {
    return NextResponse.json({ ok: false, error: 'Choose a future session time.' }, { status: 400 });
  }

  if (requestedStart.getTime() > Date.now() + 45 * 24 * 60 * 60 * 1_000) {
    return NextResponse.json({ ok: false, error: 'Choose a session within the next 45 days.' }, { status: 400 });
  }

  if (action === 'book') {
    const overlappingAgenda = (await q`
      select id, day, time_label, scheduled_at, duration_min, title, type, action, sort_order, details_json, completed_at
      from lab_agenda_items
      where user_id = ${uid}
        and action = 'book'
        and scheduled_at is not null
        and scheduled_at < ${requestedEnd}
        and (scheduled_at + (coalesce(duration_min, 60) * interval '1 minute')) > ${requestedStart}
      limit 1;
    `) as PlannedAgendaRow[];

    const existingBooking = overlappingAgenda[0];
    if (existingBooking) {
      const existingStart = toDate(existingBooking.scheduled_at);
      const requestedServiceId = normalizeText(details.serviceId);
      const existingServiceId = normalizeText(existingBooking.details_json?.serviceId);
      const isExactRetry = existingStart?.getTime() === requestedStart.getTime()
        && existingBooking.title === title
        && (!requestedServiceId || requestedServiceId === existingServiceId);

      if (isExactRetry) {
        return NextResponse.json({ ok: true, existing: true, item: serializeAgendaRow(existingBooking) });
      }

      return NextResponse.json({ ok: false, error: 'That time is no longer available. Choose another opening.' }, { status: 409 });
    }

    const importedEvents = await fetchIcalEvents();
    const overlappingImportedEvent = importedEvents.find((event) => {
      if (!event.start || !event.end) return false;
      return event.start.getTime() < requestedEnd.getTime() && event.end.getTime() > requestedStart.getTime();
    });

    if (overlappingImportedEvent) {
      return NextResponse.json(
        {
          ok: false,
          error: 'That time is no longer available. Choose another opening.',
        },
        { status: 409 }
      );
    }
  }

  const inserted = (await q`
    insert into lab_agenda_items (
      user_id,
      day,
      time_label,
      scheduled_at,
      duration_min,
      title,
      type,
      action,
      sort_order,
      details_json
    ) values (
      ${uid},
      ${day}::date,
      ${timeLabel},
      ((${day}::date + ${time24}::time) at time zone 'America/New_York'),
      ${durationMin},
      ${title},
      ${type},
      ${action},
      ${sortOrder},
      ${JSON.stringify(details)}::jsonb
    )
    returning id, day, time_label, scheduled_at, duration_min, title, type, action, sort_order, details_json, completed_at;
  `) as PlannedAgendaRow[];

  const item = inserted[0];
  return NextResponse.json({ ok: true, item: item ? serializeAgendaRow(item) : null });
}
