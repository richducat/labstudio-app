import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Support for the Lab Studio member app.',
};

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100">
      <section className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-300">Lab Studio</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Support</h1>
          <p className="text-zinc-400">
            Get help with member login, bookings, profile data, progress tracking, purchases, or account deletion.
          </p>
        </header>

        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">Email</div>
            <a className="mt-3 block text-lg font-bold text-violet-300" href="mailto:info@labstudio.fit">
              info@labstudio.fit
            </a>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">Website</div>
            <a className="mt-3 block text-lg font-bold text-violet-300" href="https://labstudio.fit">
              labstudio.fit
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-zinc-300">
          <h2 className="mb-3 text-xl font-bold text-white">Account deletion</h2>
          <p>
            Open the Lab Studio app, go to Profile, and use Delete Account. If you cannot access the app, email support
            from the email address connected to the member account and include the phone number on the account if one was
            saved.
          </p>
        </div>
      </section>
    </main>
  );
}
