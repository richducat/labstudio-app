# PR Draft — 2026-02-15 — TYFYS: Daily Sales/Ops Brief window modes

## A) What / why
The TYFYS `daily-sales-ops-brief` script is most useful when its “window” matches how you think about a day.

This PR adds a `--window` option so you can quickly generate:
- **previousBusinessDay** (default business reporting window)
- **today** (mid-day check)
- **rolling** (existing behavior: last N hours)

It also makes `--selftest` run without requiring env/token setup.

## B) Changes
- Add `--window rolling|today|previousBusinessDay` (default: `rolling` for backward compatibility).
- Compute `windowFrom/windowTo` and show them in the header for easy verification.
- Skip `loadEnvLocal()` when running `--selftest`.

## C) Files
- `scripts/tyfys/daily-sales-ops-brief.mjs`

## D) How to test
```bash
cd /Users/richardducat/clawd

# Smoke/selftest (no env needed)
node scripts/tyfys/daily-sales-ops-brief.mjs --selftest --redact --window previousBusinessDay

# Real run (uses env)
node scripts/tyfys/daily-sales-ops-brief.mjs --window previousBusinessDay --redact
node scripts/tyfys/daily-sales-ops-brief.mjs --window today --redact
node scripts/tyfys/daily-sales-ops-brief.mjs --hours 6 --window rolling --redact
```

## E) Notes / risks
- “previousBusinessDay” uses local machine time and treats Fri as the previous business day for Sat/Sun/Mon (Sun → Fri).
- No client PII/PHI changes; `--redact` remains available.

## Commit / branch
- Branch: `feat/2026-02-15-daily-brief-window`
- Commit: `f30ec10` — `feat(tyfys): add window modes to daily sales ops brief`
