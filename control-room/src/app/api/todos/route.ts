import { NextResponse } from "next/server";

// v0: placeholder.
// v1: pull from Apple Reminders (remindctl) AND/OR Second Brain tasks.json.

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "placeholder",
    todos: [
      {
        id: "enable-docs-api",
        title: "Enable Google Docs API for gogcli project 648112220445",
        due: null,
        priority: "high",
      },
      {
        id: "wire-cron-health",
        title: "Wire Control Room cards to cron health + DriftGuard",
        due: null,
        priority: "med",
      },
    ],
  });
}
