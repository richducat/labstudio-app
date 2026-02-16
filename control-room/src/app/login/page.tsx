"use client";

import { useMemo, useState } from "react";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const next = useMemo(() => {
    if (typeof window === "undefined") return "/";
    const params = new URLSearchParams(window.location.search);
    return params.get("next") || "/";
  }, []);

  async function submit() {
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, next }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error || "Invalid code");
      return;
    }
    const j = await res.json();
    window.location.href = j?.next || "/";
  }

  return (
    <div className="min-h-screen bg-[#05060a] text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="text-sm font-semibold">Control Room</div>
          <div className="mt-1 text-xs text-zinc-400">
            Enter access code to continue
          </div>

          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Access code"
            type="password"
            className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-orange-400/40"
          />

          {error ? (
            <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </div>
          ) : null}

          <button
            onClick={submit}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-orange-500/90 via-amber-400/80 to-fuchsia-500/70 px-4 py-3 text-sm font-semibold text-black hover:opacity-95"
          >
            Enter
          </button>

          <div className="mt-3 text-[11px] text-zinc-400">
            Tip: use your LabStudio code unless you set a custom Control Room
            code.
          </div>
        </div>
      </div>
    </div>
  );
}
