import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'Terms for the Lab Studio member app.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100">
      <article className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-300">Lab Studio</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Terms</h1>
          <p className="text-sm text-zinc-500">Effective April 24, 2026</p>
        </header>

        <section className="space-y-3 text-sm leading-7 text-zinc-300">
          <p>
            The Lab Studio member app supports fitness coaching, booking, nutrition logging, progress tracking, and
            member communication. The app does not replace professional medical advice, diagnosis, or treatment. Stop an
            activity and seek qualified medical help if you experience pain, dizziness, shortness of breath, or any other
            concerning symptom.
          </p>
          <p>
            Purchases in the app, when available, are for in-person training, gym services, or physical products provided
            by Lab Studio. Availability, pricing, and refund handling may vary by service or product.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-7 text-zinc-300">
          <h2 className="text-xl font-bold text-white">Contact</h2>
          <p>
            Questions about these terms can be sent to{' '}
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
