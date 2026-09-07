import { neon } from '@neondatabase/serverless';

export type LabUser = {
  id: string;
  created_at: string;
  display_name: string | null;
  xp: number;
  level: number;
  onboarding_complete: boolean;
};

export type LabGameScore = {
  id: string;
  user_id: string;
  game_id: string;
  score: number;
  created_at: string;
};

export type LabUserProfile = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  goal: string | null;
  activity_level: string | null;
  schedule_days: string[];
  nutrition_rating: number | null;
  injuries_json: unknown;
  wearables_json: unknown;
  created_at: string;
  updated_at: string;
};

export type LabUserByContact = {
  user: LabUser;
  profile: LabUserProfile;
  created: boolean;
};

function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

function normalizePhone(value: unknown) {
  if (typeof value !== 'string') return null;
  const digitsOnly = value.replace(/\D/g, '');
  if (!digitsOnly) return null;
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
    return `+${digitsOnly}`;
  }
  return null;
}

function normalizedPhoneDigits(value: string | null | undefined) {
  return normalizePhone(value)?.replace(/\D/g, '') ?? '';
}

function titleCaseWord(word: string) {
  return word ? `${word[0]?.toUpperCase() || ''}${word.slice(1)}` : '';
}

function buildDisplayName(profile: Pick<LabUserProfile, 'first_name' | 'last_name' | 'email' | 'phone'>) {
  const fullName = [profile.first_name, profile.last_name]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ');
  if (fullName) return fullName;

  const email = normalizeEmail(profile.email);
  if (email) {
    const localPart = email.split('@')[0] || '';
    const cleaned = localPart
      .split(/[._-]+/g)
      .map((part) => titleCaseWord(part.trim()))
      .filter(Boolean)
      .join(' ');
    if (cleaned) return cleaned;
    return email;
  }

  const phone = normalizePhone(profile.phone);
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      return `Member ${digits.slice(-4)}`;
    }
    return `Member ${digits.slice(-4) || digits}`;
  }

  return null;
}

function dbUrl() {
  return process.env.DATABASE_URL || '';
}

export function dbConfigured() {
  return Boolean(dbUrl());
}

export function sql() {
  const url = dbUrl();
  if (!url) throw new Error('DATABASE_URL not configured');
  return neon(url);
}

let schemaReadyPromise: Promise<void> | null = null;

async function ensureSchemaInner() {
  const q = sql();
  await q`
    create table if not exists lab_users (
      id text primary key,
      created_at timestamptz not null default now(),
      display_name text,
      xp integer not null default 0,
      level integer not null default 1,
      onboarding_complete boolean not null default false
    );
  `;

  // Backfill/upgrade older schemas (safe no-ops on fresh DBs).
  await q`alter table lab_users add column if not exists onboarding_complete boolean not null default false;`;

  await q`
    create table if not exists lab_user_profile (
      user_id text primary key references lab_users(id) on delete cascade,
      first_name text,
      last_name text,
      email text,
      phone text,
      goal text,
      activity_level text,
      schedule_days text[] not null default '{}',
      nutrition_rating integer,
      injuries_json jsonb not null default '[]'::jsonb,
      wearables_json jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;

  await q`alter table lab_user_profile add column if not exists wearables_json jsonb not null default '{}'::jsonb;`;

  await q`create index if not exists lab_user_profile_email_idx on lab_user_profile(email);`;
  await q`create index if not exists lab_user_profile_email_normalized_idx on lab_user_profile(lower(email));`;
  await q`
    create index if not exists lab_user_profile_phone_normalized_idx
    on lab_user_profile((regexp_replace(phone, '[^0-9]', '', 'g')));
  `;

  await q`
    create table if not exists lab_daily_stats (
      id bigserial primary key,
      user_id text not null references lab_users(id) on delete cascade,
      created_at timestamptz not null default now(),
      weight_lbs numeric,
      body_fat_pct numeric,
      resting_hr integer,
      note text
    );
  `;

  // Backfill/upgrade older schemas.
  await q`alter table lab_daily_stats add column if not exists resting_hr integer;`;

  await q`
    create index if not exists lab_daily_stats_user_created_at_idx on lab_daily_stats(user_id, created_at desc);
  `;

  await q`
    create table if not exists lab_nutrition_log (
      id bigserial primary key,
      user_id text not null references lab_users(id) on delete cascade,
      created_at timestamptz not null default now(),
      name text not null,
      protein_g integer not null,
      carbs_g integer not null,
      fat_g integer not null,
      time_label text
    );
  `;

  await q`
    create index if not exists lab_nutrition_log_user_created_at_idx on lab_nutrition_log(user_id, created_at desc);
  `;

  // Completed workouts (for home session log + progress tiles)
  await q`
    create table if not exists lab_workout_log (
      id bigserial primary key,
      user_id text not null references lab_users(id) on delete cascade,
      created_at timestamptz not null default now(),
      kind text,
      duration_min integer,
      note text
    );
  `;
  await q`create index if not exists lab_workout_log_user_created_at_idx on lab_workout_log(user_id, created_at desc);`;

  // Progress photos (simple: store image as data URL for now; later move to blob storage)
  await q`
    create table if not exists lab_progress_photos (
      id bigserial primary key,
      user_id text not null references lab_users(id) on delete cascade,
      created_at timestamptz not null default now(),
      image_data_url text not null,
      note text
    );
  `;
  await q`create index if not exists lab_progress_photos_user_created_at_idx on lab_progress_photos(user_id, created_at desc);`;

  // Strength PRs
  await q`
    create table if not exists lab_strength_prs (
      id bigserial primary key,
      user_id text not null references lab_users(id) on delete cascade,
      created_at timestamptz not null default now(),
      lift text not null,
      value numeric not null,
      unit text not null default 'lb',
      reps integer
    );
  `;
  await q`create index if not exists lab_strength_prs_user_created_at_idx on lab_strength_prs(user_id, created_at desc);`;

  // Coach focus cards (pin + simple long-term memory)
  await q`
    create table if not exists lab_coach_focus (
      id bigserial primary key,
      user_id text not null references lab_users(id) on delete cascade,
      created_at timestamptz not null default now(),
      text text not null,
      pinned boolean not null default false,
      pinned_at timestamptz
    );
  `;
  await q`create index if not exists lab_coach_focus_user_created_at_idx on lab_coach_focus(user_id, created_at desc);`;
  await q`create index if not exists lab_coach_focus_user_pinned_idx on lab_coach_focus(user_id, pinned, pinned_at desc);`;

  // Habits + daily check-ins
  await q`
    create table if not exists lab_habits (
      id bigserial primary key,
      user_id text not null references lab_users(id) on delete cascade,
      created_at timestamptz not null default now(),
      name text not null,
      active boolean not null default true,
      sort_order integer not null default 0
    );
  `;
  await q`create index if not exists lab_habits_user_active_idx on lab_habits(user_id, active, sort_order, created_at desc);`;

  await q`
    create table if not exists lab_habit_checkins (
      id bigserial primary key,
      user_id text not null references lab_users(id) on delete cascade,
      habit_id bigint not null references lab_habits(id) on delete cascade,
      created_at timestamptz not null default now(),
      day date not null,
      checked boolean not null default true,
      unique(user_id, habit_id, day)
    );
  `;
  await q`create index if not exists lab_habit_checkins_user_day_idx on lab_habit_checkins(user_id, day desc);`;

  // Daily agenda items (optional planned items; home dashboard can also derive “auto” items from other logs)
  await q`
    create table if not exists lab_agenda_items (
      id bigserial primary key,
      user_id text not null references lab_users(id) on delete cascade,
      created_at timestamptz not null default now(),
      day date not null,
      time_label text,
      scheduled_at timestamptz,
      duration_min integer,
      title text not null,
      type text not null,
      action text not null,
      sort_order integer not null default 0,
      details_json jsonb not null default '{}'::jsonb,
      completed_at timestamptz
    );
  `;
  await q`alter table lab_agenda_items add column if not exists scheduled_at timestamptz;`;
  await q`alter table lab_agenda_items add column if not exists duration_min integer;`;
  await q`alter table lab_agenda_items add column if not exists details_json jsonb not null default '{}'::jsonb;`;
  await q`create index if not exists lab_agenda_items_user_day_idx on lab_agenda_items(user_id, day desc, sort_order, created_at desc);`;

  // Game Scores
  await q`
    create table if not exists lab_game_scores (
      id bigserial primary key,
      user_id text not null references lab_users(id) on delete cascade,
      game_id text not null,
      score integer not null,
      created_at timestamptz not null default now()
    );
  `;
  await q`create index if not exists lab_game_scores_user_game_idx on lab_game_scores(user_id, game_id);`;
  await q`create index if not exists lab_game_scores_high_scores_idx on lab_game_scores(game_id, score desc);`;
}

export async function ensureSchema() {
  schemaReadyPromise ??= ensureSchemaInner().catch((error) => {
    schemaReadyPromise = null;
    throw error;
  });

  await schemaReadyPromise;
}


export async function getOrCreateUser(userId: string): Promise<LabUser> {
  await ensureSchema();
  const q = sql();

  const existing = (await q`select * from lab_users where id = ${userId} limit 1;`) as unknown as LabUser[];
  if (existing?.[0]) return existing[0];

  const inserted = (await q`
    insert into lab_users (id, display_name, xp, level)
    values (${userId}, null, 0, 1)
    returning *;
  `) as unknown as LabUser[];
  return inserted[0];
}

export async function getUserProfile(userId: string): Promise<LabUserProfile | null> {
  await ensureSchema();
  const q = sql();
  const rows = (await q`select * from lab_user_profile where user_id = ${userId} limit 1;`) as unknown as LabUserProfile[];
  return rows?.[0] ?? null;
}

type UpsertUserProfileInput = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  goal?: string | null;
  activity_level?: string | null;
  schedule_days?: string[];
  nutrition_rating?: number | null;
  injuries_json?: unknown;
  wearables_json?: unknown;
};

export async function upsertUserProfile(userId: string, input: UpsertUserProfileInput): Promise<LabUserProfile> {
  await ensureSchema();
  const q = sql();

  const scheduleDays = Array.isArray(input.schedule_days) ? input.schedule_days : [];
  const injuriesJson = input.injuries_json ?? [];
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = typeof input.phone === 'string' ? input.phone.trim() || null : input.phone ?? null;

  const rows = (await q`
    insert into lab_user_profile (
      user_id,
      first_name,
      last_name,
      email,
      phone,
      goal,
      activity_level,
      schedule_days,
      nutrition_rating,
      injuries_json,
      wearables_json,
      created_at,
      updated_at
    ) values (
      ${userId},
      ${input.first_name ?? null},
      ${input.last_name ?? null},
      ${normalizedEmail},
      ${normalizedPhone},
      ${input.goal ?? null},
      ${input.activity_level ?? null},
      ${scheduleDays},
      ${input.nutrition_rating ?? null},
      ${JSON.stringify(injuriesJson)}::jsonb,
      ${JSON.stringify(input.wearables_json ?? {})}::jsonb,
      now(),
      now()
    )
    on conflict (user_id) do update set
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      email = excluded.email,
      phone = excluded.phone,
      goal = excluded.goal,
      activity_level = excluded.activity_level,
      schedule_days = excluded.schedule_days,
      nutrition_rating = excluded.nutrition_rating,
      injuries_json = excluded.injuries_json,
      wearables_json = excluded.wearables_json,
      updated_at = now()
    returning *;
  `) as unknown as LabUserProfile[];

  return rows[0];
}

export async function findOrCreateUserByContact(input: {
  email?: string | null;
  phone?: string | null;
  currentUserId?: string | null;
}): Promise<LabUserByContact> {
  await ensureSchema();
  const q = sql();

  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const phoneDigits = normalizedPhoneDigits(phone);
  const currentUserId = typeof input.currentUserId === 'string' ? input.currentUserId.trim() : '';

  if (!email && !phone) {
    throw new Error('Enter an email or phone number.');
  }

  const emailMatches = email
    ? ((await q`
        select distinct user_id
        from lab_user_profile
        where lower(email) = ${email}
        limit 2;
      `) as { user_id: string }[])
    : [];

  const phoneMatches =
    phoneDigits
      ? ((await q`
          select distinct user_id
          from lab_user_profile
          where regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = ${phoneDigits}
          limit 2;
        `) as { user_id: string }[])
      : [];

  if (emailMatches.length > 1) {
    throw new Error('That email is linked to multiple accounts. Contact support to clean it up.');
  }

  if (phoneMatches.length > 1) {
    throw new Error('That phone number is linked to multiple accounts. Contact support to clean it up.');
  }

  const emailUserId = emailMatches[0]?.user_id ?? null;
  const phoneUserId = phoneMatches[0]?.user_id ?? null;

  if (emailUserId && phoneUserId && emailUserId !== phoneUserId) {
    throw new Error('That email and phone number belong to different accounts.');
  }

  let resolvedUserId = emailUserId || phoneUserId || null;
  let created = false;

  if (!resolvedUserId && currentUserId) {
    await getOrCreateUser(currentUserId);
    const currentProfile = await getUserProfile(currentUserId);
    const currentEmail = normalizeEmail(currentProfile?.email);
    const currentPhone = normalizePhone(currentProfile?.phone);
    const canReuseCurrentUser =
      (!currentEmail || !email || currentEmail === email) &&
      (!currentPhone || !phone || currentPhone === phone);

    if (canReuseCurrentUser) {
      resolvedUserId = currentUserId;
    }
  }

  if (!resolvedUserId) {
    resolvedUserId = crypto.randomUUID();
    created = true;
  }

  const user = await getOrCreateUser(resolvedUserId);
  const existingProfile = await getUserProfile(resolvedUserId);
  const profile = await upsertUserProfile(resolvedUserId, {
    first_name: existingProfile?.first_name ?? null,
    last_name: existingProfile?.last_name ?? null,
    email: email ?? existingProfile?.email ?? null,
    phone: phone ?? existingProfile?.phone ?? null,
    goal: existingProfile?.goal ?? null,
    activity_level: existingProfile?.activity_level ?? null,
    schedule_days: existingProfile?.schedule_days ?? [],
    nutrition_rating: existingProfile?.nutrition_rating ?? null,
    injuries_json: existingProfile?.injuries_json ?? [],
    wearables_json: existingProfile?.wearables_json ?? {},
  });

  const nextDisplayName = user.display_name?.trim() || buildDisplayName(profile);
  if (nextDisplayName !== user.display_name) {
    await updateUserDisplayName(resolvedUserId, nextDisplayName);
  }

  return {
    created,
    profile,
    user: {
      ...user,
      display_name: nextDisplayName,
    },
  };
}

export async function markOnboardingComplete(userId: string): Promise<void> {
  await ensureSchema();
  const q = sql();
  await q`update lab_users set onboarding_complete = true where id = ${userId};`;
}

export async function updateUserDisplayName(userId: string, displayName: string | null): Promise<void> {
  await ensureSchema();
  const q = sql();
  await q`update lab_users set display_name = ${displayName} where id = ${userId};`;
}

export async function deleteUserAccount(userId: string): Promise<void> {
  await ensureSchema();
  const q = sql();
  await q`delete from lab_users where id = ${userId};`;
}
