import { NextResponse } from "next/server";
import fs from "node:fs";

const CRON_STORE = "/Users/richardducat/.openclaw/cron/jobs.json";

export async function GET() {
  try {
    const raw = fs.readFileSync(CRON_STORE, "utf8");
    const jobs = JSON.parse(raw);

    const enabled = jobs.filter((j: any) => j.enabled);
    const errors = enabled.filter(
      (j: any) => (j.state?.consecutiveErrors ?? 0) > 0 || j.state?.lastStatus === "error",
    );

    return NextResponse.json({
      ok: true,
      store: CRON_STORE,
      total: jobs.length,
      enabled: enabled.length,
      errors: errors.map((j: any) => ({
        id: j.id,
        name: j.name,
        lastStatus: j.state?.lastStatus ?? null,
        consecutiveErrors: j.state?.consecutiveErrors ?? 0,
        lastError: j.state?.lastError ?? null,
        updatedAtMs: j.updatedAtMs ?? null,
        nextRunAtMs: j.state?.nextRunAtMs ?? null,
      })),
      checkedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 },
    );
  }
}
