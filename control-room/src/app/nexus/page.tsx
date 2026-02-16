"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  ChevronRight,
  Cpu,
  Download,
  Filter,
  Menu,
  Search,
  Shield,
  Terminal,
  Wifi,
  X,
} from "lucide-react";

type CronHealth = {
  ok: boolean;
  total?: number;
  enabled?: number;
  errors?: Array<{
    id: string;
    name: string;
    lastStatus: string | null;
    consecutiveErrors: number;
    lastError: string | null;
    updatedAtMs: number | null;
    nextRunAtMs: number | null;
  }>;
  checkedAt?: string;
  error?: string;
};

type ActivityResp = {
  ok: boolean;
  now?: string;
  branch?: string;
  recentCommits?: Array<{ sha: string; date: string; subject: string }>;
};

type StatCardProps = {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: "cyan" | "blue" | "rose" | "emerald" | "amber";
};

const COLOR = {
  cyan: "text-cyan-400",
  blue: "text-blue-400",
  rose: "text-rose-400",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
} as const;

function StatCard({ icon: Icon, label, value, sub, color }: StatCardProps) {
  return (
    <div className="relative group overflow-hidden rounded-xl bg-slate-900/50 border border-slate-800 p-5 transition-all duration-300 hover:border-slate-700 hover:shadow-[0_0_20px_rgba(0,0,0,0.3)]">
      <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${COLOR[color]}`}>
        <Icon size={56} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2 text-slate-400 text-xs font-medium uppercase tracking-wider">
          <Icon size={16} className={COLOR[color]} />
          {label}
        </div>
        <div className="text-3xl font-bold text-white mb-1 tracking-tight">
          {value}
        </div>
        {sub ? (
          <div className="text-xs font-mono text-slate-500">{sub}</div>
        ) : null}
      </div>
      <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-${color}-500/0 via-${color}-500/50 to-${color}-500/0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />
    </div>
  );
}

function SidebarItem({
  icon: Icon,
  label,
  active,
  onClick,
  collapsed,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group relative ${
        active
          ? "bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
          : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/50"
      }`}
    >
      <Icon size={20} className={active ? "animate-pulse" : ""} />
      {!collapsed && <span className="font-medium text-sm">{label}</span>}
      {active && !collapsed && (
        <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
      )}
    </button>
  );
}

function fmtMaybeDate(ms?: number | null) {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "";
  }
}

function QuickCapture({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [list, setList] = useState("Cool Cat Inbox");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function add() {
    const t = title.trim();
    if (!t) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/reminders/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, list, due: due.trim() || undefined }),
      });
      const j = await res.json();
      if (!res.ok || j?.ok === false) {
        setMsg(j?.error || "Failed to add reminder");
      } else {
        setTitle("");
        setDue("");
        setMsg("Added");
        onCreated();
        setTimeout(() => setMsg(null), 1200);
      }
    } catch (e: any) {
      setMsg(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <div className="text-xs font-mono text-slate-400">Quick capture</div>
      <div className="mt-2 flex flex-col gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void add();
          }}
          placeholder="Type a task and hit Enter…"
          className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-600"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={list}
            onChange={(e) => setList(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-200 outline-none"
          >
            <option>Cool Cat Inbox</option>
            <option>Household</option>
            <option>Routine</option>
            <option>TYFYS</option>
            <option>Everett</option>
            <option>Berkeley</option>
          </select>
          <input
            value={due}
            onChange={(e) => setDue(e.target.value)}
            placeholder='Due (e.g. "today", "tomorrow", "2026-02-16 17:00")'
            className="flex-1 min-w-[220px] rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 outline-none"
          />
          <button
            onClick={() => void add()}
            disabled={busy || !title.trim()}
            className="rounded-lg bg-cyan-500/90 px-3 py-2 text-xs font-semibold text-black disabled:opacity-40"
          >
            {busy ? "Adding…" : "Add"}
          </button>
          {msg ? (
            <span className="text-xs font-mono text-slate-400">{msg}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function NexusPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "Activity" | "Alerts" | "System" | "Settings"
  >("Activity");
  const [searchTerm, setSearchTerm] = useState("");

  const [cron, setCron] = useState<CronHealth | null>(null);
  const [activity, setActivity] = useState<ActivityResp | null>(null);
  const [reminders, setReminders] = useState<any>(null);

  async function refresh() {
    const [c, a, r] = await Promise.all([
      fetch("/api/cron-health", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/activity", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/reminders", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setCron(c);
    setActivity(a);
    setReminders(r);
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, []);

  const commits = activity?.recentCommits || [];
  const errors = cron?.errors || [];
  const overdueRem = reminders?.overdue || [];
  const todayRem = reminders?.today || [];

  const filteredCommits = useMemo(() => {
    if (!searchTerm) return commits;
    const q = searchTerm.toLowerCase();
    return commits.filter(
      (c) =>
        c.subject.toLowerCase().includes(q) ||
        c.sha.toLowerCase().includes(q) ||
        c.date.toLowerCase().includes(q),
    );
  }, [commits, searchTerm]);

  const stats = {
    totalJobs: cron?.total ?? 0,
    enabledJobs: cron?.enabled ?? 0,
    errorJobs: errors.length,
    branch: activity?.branch ?? "",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <aside
        className={`fixed left-0 top-0 h-full bg-slate-950/80 backdrop-blur-xl border-r border-slate-800 transition-all duration-300 z-50 ${
          sidebarCollapsed ? "w-20" : "w-64"
        } ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
            <div
              className={`flex items-center gap-2 ${
                sidebarCollapsed ? "justify-center w-full" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Cpu size={18} className="text-white" />
              </div>
              {!sidebarCollapsed && (
                <span className="font-bold text-lg tracking-tight text-white">
                  NEXUS<span className="text-cyan-500">OS</span>
                </span>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="md:hidden text-slate-500"
              >
                <X size={20} />
              </button>
            )}
          </div>

          <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
            <SidebarItem
              icon={Activity}
              label="Activity Feed"
              active={activeTab === "Activity"}
              onClick={() => setActiveTab("Activity")}
              collapsed={sidebarCollapsed}
            />
            <SidebarItem
              icon={AlertTriangle}
              label="Alerts"
              active={activeTab === "Alerts"}
              onClick={() => setActiveTab("Alerts")}
              collapsed={sidebarCollapsed}
            />
            <SidebarItem
              icon={Database}
              label="System"
              active={activeTab === "System"}
              onClick={() => setActiveTab("System")}
              collapsed={sidebarCollapsed}
            />
            <div className="my-4 border-t border-slate-800/50 mx-2" />
            <SidebarItem
              icon={Shield}
              label="Settings"
              active={activeTab === "Settings"}
              onClick={() => setActiveTab("Settings")}
              collapsed={sidebarCollapsed}
            />
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900/30">
            <div
              className={`flex items-center gap-3 ${
                sidebarCollapsed ? "justify-center" : ""
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center overflow-hidden">
                <span className="text-sm font-bold">RD</span>
              </div>
              {!sidebarCollapsed && (
                <div className="overflow-hidden">
                  <div className="text-sm font-medium text-white truncate">
                    Richard
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    Online • branch: {stats.branch || "—"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      <main
        className={`transition-all duration-300 min-h-screen flex flex-col ${
          sidebarCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        <header className="h-16 px-6 sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              <Menu size={20} />
            </button>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:block p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              <Menu size={20} />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-slate-500">Dashboard</span>
              <span className="text-slate-600">/</span>
              <span className="text-cyan-400 font-medium">{activeTab}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center relative group">
              <Search
                size={16}
                className="absolute left-3 text-slate-500 group-focus-within:text-cyan-400 transition-colors"
              />
              <input
                type="text"
                placeholder="Search activity…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-full py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 w-64 transition-all"
              />
            </div>

            <button
              onClick={refresh}
              className="hidden sm:flex items-center gap-2 rounded-full bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
              title="Refresh"
            >
              <Wifi size={16} />
              Refresh
            </button>

            <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
              <Bell size={20} />
              {errors.length > 0 ? (
                <>
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
                </>
              ) : null}
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Terminal}
              label="Branch"
              value={stats.branch || "—"}
              sub={activity?.now ? `as of ${new Date(activity.now).toLocaleTimeString()}` : ""}
              color="cyan"
            />
            <StatCard
              icon={Activity}
              label="Recent commits"
              value={String(commits.length)}
              sub="git log (last 8)"
              color="blue"
            />
            <StatCard
              icon={Shield}
              label="Cron enabled"
              value={`${stats.enabledJobs}/${stats.totalJobs}`}
              sub={cron?.checkedAt ? `checked ${new Date(cron.checkedAt).toLocaleTimeString()}` : ""}
              color="emerald"
            />
            <StatCard
              icon={AlertTriangle}
              label="Cron errors"
              value={String(stats.errorJobs)}
              sub={stats.errorJobs ? "needs attention" : "all clear"}
              color={stats.errorJobs ? "rose" : "amber"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Terminal size={20} className="text-cyan-500" />
                  Activity Feed
                </h2>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
                    <Filter size={14} />
                    Filter
                  </button>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
                    <Download size={14} />
                    Export
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-2xl">
                <div className="flex items-center justify-between p-4 bg-slate-900/80 border-b border-slate-800 text-xs font-mono text-slate-500 uppercase tracking-wider">
                  <div className="pl-2">Commit</div>
                  <div className="hidden sm:block pr-8">Timestamp</div>
                </div>
                <div className="divide-y divide-slate-800/50 max-h-[600px] overflow-y-auto">
                  {filteredCommits.map((c) => (
                    <div
                      key={c.sha}
                      className="group flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 group-hover:border-slate-700 transition-colors">
                          <Terminal
                            size={18}
                            className="text-slate-400 group-hover:text-cyan-400 transition-colors"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-slate-200 font-medium text-sm">
                              {c.subject}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                            <span>{c.sha}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <div className="text-slate-400 text-xs font-mono">
                            {new Date(c.date).toLocaleString()}
                          </div>
                        </div>
                        <button className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors">
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredCommits.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      No activity found.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-200">Alerts</h3>
                  <span className="text-xs font-mono text-slate-500">
                    {errors.length ? `${errors.length} error jobs` : "All clear"}
                  </span>
                </div>

                {cron?.ok === false ? (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    cron-health error: {cron.error}
                  </div>
                ) : null}

                <div className="space-y-3">
                  {errors.slice(0, 6).map((e) => (
                    <div
                      key={e.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-100">
                          {e.name}
                        </div>
                        <div className="text-xs font-mono text-rose-300">
                          {e.consecutiveErrors}x
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        next: {fmtMaybeDate(e.nextRunAtMs) || "—"}
                      </div>
                      {e.lastError ? (
                        <div className="mt-2 text-[11px] text-slate-400 line-clamp-3">
                          {e.lastError}
                        </div>
                      ) : null}
                    </div>
                  ))}

                  {!errors.length ? (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-xs text-emerald-200">
                      No cron errors detected.
                    </div>
                  ) : null}
                </div>

                {errors.length > 6 ? (
                  <div className="mt-3 text-xs text-slate-500">
                    +{errors.length - 6} more
                  </div>
                ) : null}
              </div>

              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-200">Tasks</h3>
                  <span className="text-xs font-mono text-slate-500">
                    {overdueRem.length} overdue • {todayRem.length} today
                  </span>
                </div>

                <QuickCapture onCreated={refresh} />

                {reminders?.ok === false ? (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    reminders error: {String(reminders?.errors?.[0]?.error || "unknown")}
                  </div>
                ) : null}

                <div className="space-y-3">
                  {overdueRem.slice(0, 4).map((t: any) => (
                    <div
                      key={t.id}
                      className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3"
                    >
                      <div className="text-sm font-semibold text-rose-100">
                        {t.title}
                      </div>
                      <div className="mt-1 text-xs font-mono text-rose-200/70">
                        overdue • {t.listName}
                      </div>
                    </div>
                  ))}

                  {todayRem.slice(0, 4).map((t: any) => (
                    <div
                      key={t.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"
                    >
                      <div className="text-sm font-semibold text-slate-100">
                        {t.title}
                      </div>
                      <div className="mt-1 text-xs font-mono text-slate-500">
                        today • {t.listName}
                      </div>
                    </div>
                  ))}

                  {!overdueRem.length && !todayRem.length ? (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-xs text-emerald-200">
                      No overdue or due-today reminders.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border border-indigo-500/20 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-20">
                  <Wifi size={80} className="text-indigo-500" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-indigo-200 font-medium text-sm mb-1">
                    Cron store
                  </h3>
                  <div className="text-2xl font-bold text-white mb-2">
                    {stats.totalJobs} jobs
                  </div>
                  <div className="text-xs font-mono text-slate-300">
                    enabled: {stats.enabledJobs} • errors: {stats.errorJobs}
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                <div>
                  <h4 className="text-amber-200 font-medium text-sm">
                    Safe buttons (next)
                  </h4>
                  <p className="text-amber-500/70 text-xs mt-1">
                    Run DriftGuard now • Open Vercel logs • Refresh
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Data sources: /api/activity (git) • /api/cron-health (OpenClaw cron
            store)
          </div>
        </div>
      </main>
    </div>
  );
}

// NOTE: lucide Database icon import name.
function Database(props: any) {
  // lazy import substitute to avoid adding more imports up top
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("lucide-react");
  const Icon = mod.Database;
  return <Icon {...props} />;
}
