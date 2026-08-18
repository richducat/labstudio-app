import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for the Lab Studio member app.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100">
      <article className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-300">Lab Studio</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Privacy Policy</h1>
          <p className="text-sm text-zinc-500">Effective April 24, 2026</p>
        </header>

        <section className="space-y-3 text-sm leading-7 text-zinc-300">
          <p>
            Lab Studio uses the member app to support training, nutrition, booking, progress tracking, and coach
            communication. We collect the information you provide, including contact details, profile details,
            check-ins, progress photos, workouts, habits, booking activity, and messages you send to coaching features.
          </p>
          <p>
            We use this information to operate the member experience, personalize training and recovery guidance, keep
            your profile available across sessions, process purchases for in-person services or products, and respond to
            support requests.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-7 text-zinc-300">
          <h2 className="text-xl font-bold text-white">Sharing</h2>
          <p>
            We do not sell member personal information. We share information only with service providers needed to run
            the app, such as hosting, database, calendar, payment, analytics, and AI service providers, and when required
            by law or to protect the app and members.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-7 text-zinc-300">
          <h2 className="text-xl font-bold text-white">Retention and Deletion</h2>
          <p>
            We keep account data while your member account is active. You can delete your account inside the app from the
            Profile screen. Account deletion removes the member account and associated app data that is tied to that
            account, subject to records we must retain for legal, payment, fraud-prevention, or business obligations.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-7 text-zinc-300">
          <h2 className="text-xl font-bold text-white">Contact</h2>
          <p>
            For privacy requests or questions, email{' '}
            <a className="font-semibold text-violet-300" href="mailto:info@labstudio.fit">
              info@labstudio.fit
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
