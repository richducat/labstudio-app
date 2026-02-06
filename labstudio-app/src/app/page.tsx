import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const jar = await cookies();
  const session = jar.get('labstudio_session')?.value;
  const uid = jar.get('labstudio_uid')?.value;

  // If the user is already authenticated, take them straight into the app.
  if (session === 'ok' && uid) {
    redirect('/members');
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-xl">
        <div className="rounded-3xl border border-white/10 bg-zinc-900/60 backdrop-blur p-8">
          <div className="text-[11px] tracking-[0.35em] uppercase text-zinc-400 font-bold">Lab Studio</div>
          <h1 className="mt-3 text-4xl font-black italic tracking-tight leading-[0.95]">
            Members
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 via-fuchsia-400 to-white">
              dashboard
            </span>
          </h1>
          <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
            Sign in to access your coaching plan, bookings, check-ins, nutrition logs, and progress tiles.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/login?next=/members"
              className="inline-flex items-center justify-center rounded-full bg-violet-600 hover:bg-violet-500 transition px-5 py-3 font-bold text-sm"
            >
              Sign in
            </Link>
            <Link
              href="/login?next=/onboarding"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-zinc-950/40 hover:bg-zinc-900 transition px-5 py-3 font-bold text-sm text-zinc-200"
            >
              New member? Start onboarding
            </Link>
          </div>

          <div className="mt-6 text-[11px] text-zinc-500">
            Tip: once you’re signed in, visiting <span className="font-mono">/</span> will automatically redirect you to{' '}
            <span className="font-mono">/members</span>.
          </div>
        </div>
      </div>
    </main>
  );
}
