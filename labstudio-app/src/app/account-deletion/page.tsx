import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account Deletion',
  description: 'How to delete a Lab Studio member account.',
};

export default function AccountDeletionPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100">
      <article className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-300">Lab Studio</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Account Deletion</h1>
          <p className="text-zinc-400">Members can delete their account directly from the app.</p>
        </header>

        <section className="space-y-3 text-sm leading-7 text-zinc-300">
          <h2 className="text-xl font-bold text-white">Delete in the app</h2>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Sign in to Lab Studio with the email address or phone number connected to your account.</li>
            <li>Open Profile.</li>
            <li>Select Delete Account and confirm the deletion prompt.</li>
          </ol>
        </section>

        <section className="space-y-3 text-sm leading-7 text-zinc-300">
          <h2 className="text-xl font-bold text-white">Delete by request</h2>
          <p>
            If you cannot access the app, email{' '}
            <a className="font-semibold text-violet-300" href="mailto:info@labstudio.fit">
              info@labstudio.fit
            </a>{' '}
            from the email address connected to the account. Include the phone number on the account if one was saved.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-7 text-zinc-300">
          <h2 className="text-xl font-bold text-white">What is deleted</h2>
          <p>
            Account deletion removes the member profile and associated in-app training, nutrition, habit, booking,
            progress photo, coach focus, and game score data tied to the account. Some payment, fraud-prevention, legal,
            or business records may be retained when required.
          </p>
        </section>
      </article>
    </main>
  );
}
