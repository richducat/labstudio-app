#!/usr/bin/env bash
set -euo pipefail

# Safe wrapper around `vercel link` / `vercel env pull`.
#
# Why: Vercel CLI can overwrite .env.local when linking or pulling env vars.
# This script ALWAYS backs up .env.local first.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TS="$(date +"%Y%m%d-%H%M%S")"

if [ -f .env.local ]; then
  cp .env.local ".env.local.bak.${TS}"
  echo "Backed up .env.local -> .env.local.bak.${TS}"
fi

# Link project (non-interactive)
if [ "${1-}" = "--pull" ]; then
  # Pull *development* envs into .env.local (Vercel default behavior)
  npx vercel link --yes
else
  npx vercel link --yes
fi

echo "Done. If .env.local changed unexpectedly, restore from the .env.local.bak.* backup."