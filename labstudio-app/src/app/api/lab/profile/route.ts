import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  dbConfigured,
  ensureSchema,
  getOrCreateUser,
  getUserProfile,
  markOnboardingComplete,
  updateUserDisplayName,
  upsertUserProfile,
} from '@/lib/db';

export const runtime = 'nodejs';

function hasOwn(obj: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function normalizeScheduleDays(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((d) => String(d).trim())
    .filter(Boolean)
    .slice(0, 7);
}

function normalizeInjuriesJson(v: unknown): unknown {
  // We store this as jsonb. Keep it reasonably structured.
  if (v == null) return [];
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof v === 'string') {
    const parts = v
      .split(/\n|,/g)
      .map((s) => s.trim())
      .filter(Boolean);
    return parts;
  }
  if (typeof v === 'object') return v;
  return [];
}

function normalizeWearablesJson(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  return v as Record<string, unknown>;
}

function isProfileComplete(profile: { first_name?: string | null; last_name?: string | null; goal?: string | null } | null) {
  return Boolean(profile?.first_name?.trim()) && Boolean(profile?.last_name?.trim()) && Boolean(profile?.goal?.trim());
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
  const user = await getOrCreateUser(uid);
  const profile = await getUserProfile(uid);
  const profileComplete = isProfileComplete(profile);

  return NextResponse.json({ ok: true, onboarding_complete: user.onboarding_complete && profileComplete, profile });
}

export async function POST(req: Request) {
  if (!dbConfigured()) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL not configured' }, { status: 400 });
  }

  const jar = await cookies();
  const uid = jar.get('labstudio_uid')?.value;
  if (!uid) {
    return NextResponse.json({ ok: false, error: 'Missing labstudio_uid cookie' }, { status: 401 });
  }

  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  await ensureSchema();
  await getOrCreateUser(uid);
  const existingProfile = await getUserProfile(uid);
  const currentWearables = normalizeWearablesJson(existingProfile?.wearables_json);

  const profile = await upsertUserProfile(uid, {
    first_name: hasOwn(b, 'first_name')
      ? typeof b.first_name === 'string'
        ? b.first_name
        : null
      : existingProfile?.first_name ?? null,
    last_name: hasOwn(b, 'last_name')
      ? typeof b.last_name === 'string'
        ? b.last_name
        : null
      : existingProfile?.last_name ?? null,
    email: hasOwn(b, 'email')
      ? typeof b.email === 'string'
        ? b.email
        : null
      : existingProfile?.email ?? null,
    phone: hasOwn(b, 'phone')
      ? typeof b.phone === 'string'
        ? b.phone
        : null
      : existingProfile?.phone ?? null,
    goal: hasOwn(b, 'goal')
      ? typeof b.goal === 'string'
        ? b.goal
        : null
      : existingProfile?.goal ?? null,
    activity_level: hasOwn(b, 'activity_level')
      ? typeof b.activity_level === 'string'
        ? b.activity_level
        : null
      : existingProfile?.activity_level ?? null,
    schedule_days: hasOwn(b, 'schedule_days')
      ? normalizeScheduleDays(b.schedule_days)
      : existingProfile?.schedule_days ?? [],
    nutrition_rating: hasOwn(b, 'nutrition_rating')
      ? b.nutrition_rating == null
        ? null
        : Number.isFinite(Number(b.nutrition_rating))
          ? Number(b.nutrition_rating)
          : null
      : existingProfile?.nutrition_rating ?? null,
    injuries_json: hasOwn(b, 'injuries_json')
      ? normalizeInjuriesJson(b.injuries_json)
      : existingProfile?.injuries_json ?? [],
    wearables_json: hasOwn(b, 'wearables_json')
      ? { ...currentWearables, ...normalizeWearablesJson(b.wearables_json) }
      : currentWearables,
  });

  // Make the UI feel like it "took" immediately.
  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null;
  await updateUserDisplayName(uid, displayName);
  const profileComplete = isProfileComplete(profile);
  if (profileComplete) {
    await markOnboardingComplete(uid);
  }

  return NextResponse.json({ ok: true, profile, onboarding_complete: profileComplete });
}
