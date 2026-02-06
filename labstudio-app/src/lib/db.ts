import { neon } from '@neondatabase/serverless';

export type LabUser = {
  id: string;
  created_at: string;
  display_name: string | null;
  xp: number;
  level: number;
  food_credits: number;
  onboarding_complete: boolean;
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
  created_at: string;
  updated_at: string;
};

function dbUrl() {
  return process.env.DATABASE_URL || '';
}

export function dbConfigured() {
  return Boolean(dbUrl());
}

function sql() {
  const url = dbUrl();
  if (!url) throw new Error('DATABASE_URL not configured');
  return neon(url);
}

export async function ensureSchema() {
  const q = sql();
  await q`
    create table if not exists lab_users (
      id text primary key,
      created_at timestamptz not null default now(),
      display_name text,
      xp integer not null default 0,
      level integer not null default 1,
      food_credits integer not null default 0,
      onboarding_complete boolean not null default false
    );
  `;

  // Backfill/upgrade older schemas (safe no-ops on fresh DBs).
  await q`alter table lab_users add column if not exists onboarding_complete boolean not null default false;`;
  await q`alter table lab_users add column if not exists food_credits integer not null default 0;`;

  // Shop: products + entitlements (deep link to Stripe checkout)
  await q`
    create table if not exists lab_products (
      id bigserial primary key,
      slug text unique not null,
      name text not null,
      description text,
      price_cents integer,
      checkout_url text,
      image_url text,
      active boolean not null default true,
      created_at timestamptz not null default now()
    );
  `;

  await q`
    create table if not exists lab_user_entitlements (
      id bigserial primary key,
      user_id text not null references lab_users(id) on delete cascade,
      product_slug text not null references lab_products(slug) on delete cascade,
      created_at timestamptz not null default now(),
      unique(user_id, product_slug)
    );
  `;

  await q`create index if not exists lab_user_entitlements_user_idx on lab_user_entitlements(user_id);`;

  // Backfill/upgrade older schemas.
  await q`alter table lab_products add column if not exists image_url text;`;

  // Waivers (deep links to WaiverElectronic)
  await q`
    create table if not exists lab_waivers (
      id bigserial primary key,
      slug text unique not null,
      title text not null,
      description text,
      url text not null,
      applies_to text,
      active boolean not null default true,
      created_at timestamptz not null default now()
    );
  `;

  await q`create index if not exists lab_waivers_active_idx on lab_waivers(active);`;

  // Studio Cafe items (for in-app ordering / tracking)
  await q`
    create table if not exists lab_cafe_items (
      id bigserial primary key,
      slug text unique not null,
      name text not null,
      category text not null,
      price_cents integer not null,
      product_url text,
      image_url text,
      stripe_product_id text,
      stripe_price_id text,
      active boolean not null default true,
      created_at timestamptz not null default now()
    );
  `;
  await q`alter table lab_cafe_items add column if not exists image_url text;`;
  await q`alter table lab_cafe_items add column if not exists stripe_product_id text;`;
  await q`alter table lab_cafe_items add column if not exists stripe_price_id text;`;
  await q`create index if not exists lab_cafe_items_category_idx on lab_cafe_items(category);`;

  // Content pages (static marketing/info pages mirrored inside app; DB-backed)
  await q`
    create table if not exists lab_content_pages (
      id bigserial primary key,
      slug text unique not null,
      title text not null,
      body_md text not null,
      source_url text,
      active boolean not null default true,
      updated_at timestamptz not null default now(),
      created_at timestamptz not null default now()
    );
  `;
  await q`create index if not exists lab_content_pages_active_idx on lab_content_pages(active);`;

  // Gym setup / onboarding checklist (manual confirmations)
  await q`
    create table if not exists lab_user_setup (
      user_id text primary key references lab_users(id) on delete cascade,
      access_product_slug text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;

  await q`
    create table if not exists lab_user_setup_steps (
      id bigserial primary key,
      user_id text not null references lab_users(id) on delete cascade,
      step_slug text not null,
      completed_at timestamptz,
      created_at timestamptz not null default now(),
      unique(user_id, step_slug)
    );
  `;
  await q`create index if not exists lab_user_setup_steps_user_idx on lab_user_setup_steps(user_id);`;

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
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;

  await q`create index if not exists lab_user_profile_email_idx on lab_user_profile(email);`;

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
}

export async function getOrCreateUser(userId: string): Promise<LabUser> {
  await ensureSchema();
  const q = sql();

  const existing = (await q`select * from lab_users where id = ${userId} limit 1;`) as unknown as LabUser[];
  if (existing?.[0]) return existing[0];

  const inserted = (await q`
    insert into lab_users (id, display_name, xp, level, food_credits)
    values (${userId}, null, 0, 1, 0)
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
};

export async function upsertUserProfile(userId: string, input: UpsertUserProfileInput): Promise<LabUserProfile> {
  await ensureSchema();
  const q = sql();

  const scheduleDays = Array.isArray(input.schedule_days) ? input.schedule_days : [];
  const injuriesJson = input.injuries_json ?? [];

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
      created_at,
      updated_at
    ) values (
      ${userId},
      ${input.first_name ?? null},
      ${input.last_name ?? null},
      ${input.email ?? null},
      ${input.phone ?? null},
      ${input.goal ?? null},
      ${input.activity_level ?? null},
      ${scheduleDays},
      ${input.nutrition_rating ?? null},
      ${JSON.stringify(injuriesJson)}::jsonb,
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
      updated_at = now()
    returning *;
  `) as unknown as LabUserProfile[];

  return rows[0];
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
