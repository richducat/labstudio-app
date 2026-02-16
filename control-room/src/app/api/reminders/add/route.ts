import { NextResponse } from "next/server";
import { execSync } from "node:child_process";

function run(cmd: string) {
  return execSync(cmd, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const title = String(body?.title || "").trim();
  const list = String(body?.list || "Cool Cat Inbox").trim();
  const due = String(body?.due || "").trim();
  const priority = String(body?.priority || "none").trim();

  if (!title) {
    return NextResponse.json(
      { ok: false, error: "Missing title" },
      { status: 400 },
    );
  }

  // Basic safety: avoid shell injection by only allowing safe chars in list/priority.
  // Title is passed via JSON but still used in shell; escape quotes.
  const safeList = list.replace(/[^a-zA-Z0-9 _\-]/g, "");
  const safePriority = ["none", "low", "medium", "high"].includes(priority)
    ? priority
    : "none";
  const safeDue = due ? due.replace(/[^a-zA-Z0-9 :T\-+Z]/g, "") : "";
  const safeTitle = title.replace(/"/g, "\\\"");

  const parts = [
    `remindctl add --title "${safeTitle}"`,
    safeList ? `--list "${safeList.replace(/"/g, "")}"` : "",
    safeDue ? `--due "${safeDue.replace(/"/g, "")}"` : "",
    safePriority ? `--priority ${safePriority}` : "",
    "--json",
    "--no-input",
  ].filter(Boolean);

  const cmd = parts.join(" ");

  try {
    const out = run(cmd);
    const created = JSON.parse(out);
    return NextResponse.json({ ok: true, created, cmd: "remindctl add …" });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 },
    );
  }
}
