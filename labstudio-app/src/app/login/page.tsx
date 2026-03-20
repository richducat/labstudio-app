import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Activity, ArrowRight, HeartPulse, LogIn, Mail, Phone, Sparkles } from 'lucide-react';
import { dbConfigured, findOrCreateUserByContact } from '@/lib/db';
import { createLabstudioSessionToken, getSessionSecret, SESSION_COOKIE_MAX_AGE_SECONDS, verifyLabstudioSessionToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

const UID_COOKIE = 'labstudio_uid';
const SESSION_COOKIE = 'labstudio_session';
const UID_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

function safeNextPath(value: unknown) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/members';
}

function isSecureCookie() {
  return process.env.NODE_ENV === 'production';
}

function loginRedirect(nextPath: string, error: string) {
  const params = new URLSearchParams();
  params.set('next', nextPath);
  params.set('error', error);
  return `/login?${params.toString()}`;
}

const memberAccessHighlights = [
  {
    icon: Activity,
    label: 'Training',
    accent: 'bg-violet-500/15 text-violet-300 border border-violet-500/20',
  },
  {
    icon: HeartPulse,
    label: 'Recovery',
    accent: 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/20',
  },
  {
    icon: Sparkles,
    label: 'Coaching',
    accent: 'bg-white/10 text-zinc-100 border border-white/10',
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) || {};
  const nextPath = safeNextPath(typeof sp.next === 'string' ? sp.next : undefined);
  const error = typeof sp.error === 'string' ? sp.error : '';

  const secret = getSessionSecret();
  const jar = await cookies();
  const existingSession = jar.get(SESSION_COOKIE)?.value;

  if (existingSession && secret) {
    const session = await verifyLabstudioSessionToken(existingSession, secret);
    if (session?.userId) {
      redirect(nextPath);
    }
  }

  async function loginAction(formData: FormData) {
    'use server';

    const nextFromForm = safeNextPath(formData.get('next'));
    const email = typeof formData.get('email') === 'string' ? String(formData.get('email')) : '';
    const phone = typeof formData.get('phone') === 'string' ? String(formData.get('phone')) : '';

    if (!dbConfigured()) {
      redirect(loginRedirect(nextFromForm, 'Database is not configured.'));
    }

    const sessionSecret = getSessionSecret();
    if (!sessionSecret) {
      redirect(loginRedirect(nextFromForm, 'Session secret is not configured.'));
    }

    try {
      const cookieJar = await cookies();
      const currentUserId = cookieJar.get(UID_COOKIE)?.value ?? null;
      const { user } = await findOrCreateUserByContact({
        email,
        phone,
        currentUserId,
      });

      const sessionToken = await createLabstudioSessionToken(user.id, sessionSecret);
      const secure = isSecureCookie();

      cookieJar.set({
        name: SESSION_COOKIE,
        value: sessionToken,
        httpOnly: true,
        sameSite: 'lax',
        secure,
        path: '/',
        maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
      });

      cookieJar.set({
        name: UID_COOKIE,
        value: user.id,
        httpOnly: true,
        sameSite: 'lax',
        secure,
        path: '/',
        maxAge: UID_COOKIE_MAX_AGE_SECONDS,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to log in.';
      redirect(loginRedirect(nextFromForm, message));
    }

    redirect(nextFromForm);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.34),_transparent_34%),radial-gradient(circle_at_85%_18%,_rgba(217,70,239,0.18),_transparent_26%),linear-gradient(180deg,_#050508_0%,_#09090b_42%,_#18181b_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[44vh] bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.28),_transparent_62%)]" />
        <div className="absolute left-1/2 top-16 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-600/25 blur-3xl" />
        <div className="absolute right-[10%] top-[14%] h-56 w-56 rounded-full bg-fuchsia-600/10 blur-3xl" />
        <div className="absolute left-[10%] bottom-[12%] h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute inset-x-[-18%] bottom-[-18%] h-[52%] rounded-[50%] border border-white/8" />
        <div className="absolute inset-x-[-10%] bottom-[-26%] h-[46%] rounded-[50%] border border-violet-400/10" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-[540px]">
          <div className="rounded-[2.4rem] border border-white/10 bg-white/[0.03] p-2 shadow-[0_35px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <section className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,_rgba(24,24,27,0.96)_0%,_rgba(9,9,11,0.98)_100%)] px-6 py-7 sm:px-8 sm:py-8">
              <div aria-hidden="true" className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.18),_transparent_74%)]" />

              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-200">
                    Members Login
                  </div>
                </div>

                <div className="mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-violet-500/20 bg-[linear-gradient(180deg,_rgba(255,255,255,0.08)_0%,_rgba(255,255,255,0.03)_100%)] shadow-[0_20px_55px_rgba(124,58,237,0.22)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,_#8b5cf6_0%,_#6d28d9_100%)] text-white shadow-[0_12px_28px_rgba(124,58,237,0.35)]">
                    <LogIn className="h-6 w-6" />
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <div className="text-sm font-semibold uppercase tracking-[0.34em] text-violet-300">Lab Studio</div>
                  <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-[2.4rem]">
                    Sign in with email or phone
                  </h1>
                </div>

                {error ? (
                  <div className="mt-6 rounded-[1.4rem] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                ) : null}

                <form action={loginAction} className="mt-8 grid gap-4">
                  <input type="hidden" name="next" value={nextPath} />

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">Email</span>
                    <div className="group flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-violet-500/50 focus-within:bg-violet-500/10 focus-within:ring-4 focus-within:ring-violet-500/10">
                      <Mail className="h-4 w-4 text-zinc-500 transition group-focus-within:text-violet-300" />
                      <input
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-zinc-500"
                      />
                    </div>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">Phone Number</span>
                    <div className="group flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-violet-500/50 focus-within:bg-violet-500/10 focus-within:ring-4 focus-within:ring-violet-500/10">
                      <Phone className="h-4 w-4 text-zinc-500 transition group-focus-within:text-violet-300" />
                      <input
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="(555) 555-5555"
                        className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-zinc-500"
                      />
                    </div>
                  </label>

                  <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                    <span>Use either one. Add both if you want them linked.</span>
                    <span className="font-semibold text-violet-300">Same member profile</span>
                  </div>

                  <button
                    type="submit"
                    className="mt-2 inline-flex items-center justify-center gap-2 rounded-[1.4rem] bg-[linear-gradient(135deg,_#7c3aed_0%,_#a21caf_100%)] px-4 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-[0_18px_34px_rgba(124,58,237,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_42px_rgba(124,58,237,0.42)]"
                  >
                    Enter Lab Studio
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>

                <div className="mt-6 flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                  <div className="h-px flex-1 bg-white/10" />
                  Member Access
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  {memberAccessHighlights.map(({ icon: Icon, label, accent }) => (
                    <div
                      key={label}
                      className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-3 py-4 text-center shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
                    >
                      <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-2xl ${accent}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="mt-2 text-sm font-semibold text-zinc-200">{label}</div>
                    </div>
                  ))}
                </div>

                <p className="mt-6 text-center text-xs leading-5 text-zinc-500">
                  Use the same email address or phone number next time and we&apos;ll reopen this member account.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
