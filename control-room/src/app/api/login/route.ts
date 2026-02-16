import { NextResponse } from "next/server";

const COOKIE = "control_room_session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = String(body?.code || "");
  const next = String(body?.next || "/");

  // Default: reuse LabStudio code unless explicitly overridden.
  const expected = process.env.CONTROL_ROOM_ACCESS_CODE || "LABSTUDIO2026";

  if (!code || code !== expected) {
    return NextResponse.json(
      { ok: false, error: "Invalid access code" },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true, next });
  res.cookies.set(COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
