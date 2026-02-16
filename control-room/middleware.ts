import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "control_room_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow these without auth
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const session = req.cookies.get(COOKIE)?.value;
  if (session === "1") return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/:path*"],
};
