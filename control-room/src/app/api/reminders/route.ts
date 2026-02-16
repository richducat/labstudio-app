import { NextResponse } from "next/server";
import { execSync } from "node:child_process";

function run(cmd: string) {
  return execSync(cmd, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function safeJson(cmd: string) {
  try {
    const out = run(cmd);
    return JSON.parse(out);
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e), cmd };
  }
}

export async function GET() {
  // Apple Reminders = task truth.
  // No mock data: this only returns what Reminders actually contains.
  const overdue = safeJson("remindctl overdue --json");
  const today = safeJson("remindctl today --json");
  const week = safeJson("remindctl week --json");

  const ok =
    Array.isArray(overdue) && Array.isArray(today) && Array.isArray(week);

  return NextResponse.json({
    ok,
    checkedAt: new Date().toISOString(),
    overdue: Array.isArray(overdue) ? overdue : [],
    today: Array.isArray(today) ? today : [],
    week: Array.isArray(week) ? week : [],
    errors: [overdue, today, week]
      .filter((x: any) => x && x.ok === false)
      .map((x: any) => ({ cmd: x.cmd, error: x.error })),
  });
}
