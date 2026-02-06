#!/usr/bin/env bash
set -euo pipefail

# Prevent overlapping runs (LaunchAgent StartInterval can trigger while a prior run is still active)
LOCK_DIR="/tmp/tyfys-sync-attachments.lock"

if mkdir "$LOCK_DIR" 2>/dev/null; then
  trap 'rmdir "$LOCK_DIR" >/dev/null 2>&1 || true' EXIT
else
  echo "[sync-attachments] Another run is in progress; exiting." >&2
  exit 0
fi

cd /Users/richardducat/clawd
exec /opt/homebrew/bin/node scripts/tyfys/sync-client-email-attachments-to-zoho.mjs
