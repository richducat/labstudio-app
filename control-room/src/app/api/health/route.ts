import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "control-room",
    now: new Date().toISOString(),
  });
}
