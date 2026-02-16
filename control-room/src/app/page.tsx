/* eslint-disable @next/next/no-html-link-for-pages */

import Link from "next/link";

type Stat = { label: string; value: string; tone?: "good" | "warn" | "bad" };

function ToneDot({ tone }: { tone?: Stat["tone"] }) {
  const cls =
    tone === "good"
      ? "bg-emerald-400"
      : tone === "warn"
        ? "bg-amber-400"
        : tone === "bad"
          ? "bg-rose-400"
          : "bg-zinc-400";
  return <span className={`inline-block size-2 rounded-full ${cls}`} />;
}

function Card({
  title,
  children,
  hint,
  rightBadge,
}: {
  title: string;
  hint?: string;
  rightBadge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -left-24 -top-24 h-48 w-48 rounded-full bg-gradient-to-br from-orange-400/20 via-amber-300/10 to-transparent blur-2xl" />
        <div className="absolute -right-24 -bottom-24 h-48 w-48 rounded-full bg-gradient-to-tr from-fuchsia-400/10 via-cyan-300/10 to-transparent blur-2xl" />
      </div>

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold tracking-wide text-zinc-100">
            {title}
          </div>
          {hint ? (
            <div className="mt-1 text-xs text-zinc-400">{hint}</div>
          ) : null}
        </div>
        {rightBadge ? (
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-1 text-[11px] text-zinc-300">
            {rightBadge}
          </div>
        ) : null}
      </div>

      <div className="relative mt-4">{children}</div>
    </div>
  );
}

export default async function Home() {
  // v0: static “cool cockpit”.
  // v1: wire these to server-side loaders that read cron/jobs.json, git log, etc.
  const stats: Stat[] = [
    { label: "DriftGuard", value: "Online", tone: "good" },
    { label: "Cron", value: "Healthy", tone: "good" },
    { label: "Google (gog)", value: "Docs API disabled", tone: "warn" },
    { label: "Money target", value: "$10k/week", tone: "warn" },
  ];

  return (
    <div className="min-h-screen bg-[#05060a] text-zinc-100">
      {/* Background: PostHog-ish + Overcooked energy */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_30%_20%,rgba(255,140,0,0.18),transparent_55%),radial-gradient(900px_circle_at_70%_30%,rgba(0,255,255,0.10),transparent_50%),radial-gradient(1000px_circle_at_50%_80%,rgba(255,0,200,0.10),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,rgba(255,255,255,0.4)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.4)_1px,transparent_1px)] [background-size:64px_64px]" />
      </div>

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl border border-white/10 bg-white/5 shadow">
            <span className="text-lg font-black tracking-tight">CR</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-200">Control Room</div>
            <div className="text-xs text-zinc-400">
              PostHog × Overcooked — ship money without drift
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <Link
            href="#projects"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10"
          >
            Projects
          </Link>
          <Link
            href="#jobs"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10"
          >
            Jobs
          </Link>
          <Link
            href="#activity"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10"
          >
            Activity
          </Link>
        </nav>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-8">
            <Card
              title="Now cooking"
              hint="What Cool Cat is doing right now (v0 placeholder)"
              rightBadge="Kitchen"
            >
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-xs text-zinc-400">Current task</div>
                  <div className="mt-1 text-base font-semibold">
                    Build Control Room v0 (cool cockpit UI)
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                    <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                      ETA: ~30–60 min
                    </span>
                    <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                      Output: running dashboard + PR
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="text-xs text-zinc-400">Next action</div>
                    <div className="mt-1 text-sm font-semibold">
                      Wire cards to real loaders
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      cron store • git activity • drift health
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="text-xs text-zinc-400">Blocker</div>
                    <div className="mt-1 text-sm font-semibold">
                      Google Docs API disabled
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      enable in Cloud project 648112220445
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="md:col-span-4" id="jobs">
            <Card title="Health" hint="High-signal status lights">
              <div className="space-y-3">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <ToneDot tone={s.tone} />
                      <div className="text-xs text-zinc-300">{s.label}</div>
                    </div>
                    <div className="text-xs font-semibold text-zinc-100">
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs text-zinc-200 hover:bg-white/10"
                  href="/api/health"
                >
                  Health API
                </a>
                <a
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs text-zinc-200 hover:bg-white/10"
                  href="/api/activity"
                >
                  Activity API
                </a>
              </div>
            </Card>
          </div>

          <div className="md:col-span-6" id="projects">
            <Card title="Projects" hint="Revenue-first lanes">
              <div className="grid gap-3">
                {["LabStudio", "Paid Media Buyer Pro", "TYFYS Ops", "Second Brain"].map(
                  (p) => (
                    <div
                      key={p}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-4"
                    >
                      <div>
                        <div className="text-sm font-semibold">{p}</div>
                        <div className="mt-1 text-xs text-zinc-400">
                          DONE = App Store-ready (universal)
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
                          Open
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </Card>
          </div>

          <div className="md:col-span-6" id="activity">
            <Card title="Recent activity" hint="Commits, cron edits, file writes">
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-xs text-zinc-400">Latest</div>
                  <div className="mt-1 text-sm font-semibold">
                    Re-auth gog + discovered Docs API disabled
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    Next: enable Docs API in Cloud Console
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-xs text-zinc-400">Next</div>
                  <div className="mt-1 text-sm font-semibold">
                    Wire data loaders (cron + git) + safe buttons
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    Ship as “Control Room + DriftGuard” template
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 text-xs text-zinc-300">
          <div className="font-semibold text-zinc-100">
            Roadmap (so we can sell this)
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              v0 (today): cool cockpit UI + basic APIs that read local state
              (cron/jobs.json, git log).
            </li>
            <li>
              v1: auth (local), realtime “now doing”, safe action buttons (run
              job, open PR), alerts feed.
            </li>
            <li>
              v2: package as a template product for the community: “Control Room
              + DriftGuard”.
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
