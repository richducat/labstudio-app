import { NextResponse } from "next/server";
import { execSync } from "node:child_process";

function safe(cmd: string) {
  try {
    return execSync(cmd, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      cwd: process.cwd(),
    }).trim();
  } catch {
    return "";
  }
}

export async function GET() {
  // v0: show a tiny git sample so you can *see work happening*.
  const git = safe("git log -n 8 --pretty=format:%h\t%ad\t%s --date=iso-strict");
  const branch = safe("git rev-parse --abbrev-ref HEAD");

  return NextResponse.json({
    ok: true,
    now: new Date().toISOString(),
    branch,
    recentCommits: git
      ? git.split("\n").map((line) => {
          const [sha, date, ...rest] = line.split("\t");
          return { sha, date, subject: rest.join("\t") };
        })
      : [],
  });
}
