# Drift Protection (System Integrity)

Goal: prevent “silent breakage” + “forgot what we decided” drift across automations, repos, and outputs.

## Truths / Limits (non-negotiable)
- **100% perfect forever is not achievable** in any automation system (external APIs change, tokens revoke, networks fail, vendors ship breaking updates).
- What *is* achievable is: **zero silent failures** + **fast detection** + **automatic containment** + **single source of truth** so we don’t backslide.

This document is the runbook and the contract.

---

## Single Sources of Truth

### 1) Priorities
- `memory/goals-master.md` — canonical priorities and revenue-first goals.

### 2) Current execution context
- `memory/context-anchor.md` — refreshed frequently; top commitments, non-negotiables, active workstreams, detected breakages.

### 3) Long-term operating rules
- `MEMORY.md` — guardrails (draft-first email, revenue-first, friction rule, etc.).

Rule: **Any change to “how we do things” must land in one of the above within 24h**.

---

## DriftGuard Layers (Defense in Depth)

### Layer A — Cron health sentinel (hourly)
Catches:
- enabled job errors
- consecutiveErrors > 0
- jobs that stopped running

Policy:
- **Fix the original job** (do not replace with reduced-scope alternates).

### Layer B — Preflight (daily, before morning ops)
Catches:
- credential/token problems (gog, RingCentral, Zoho)
- delivery routing issues (Telegram group/topic ids)
- GitHub/branch hygiene regressions

### Layer C — Change-control audit (daily)
Catches:
- “one-off changes” that were not reflected in the anchors

Mechanism:
- if git commits touched `scripts/**`, `docs/**`, `.openclaw config`, or cron jobs in last 24h **without** a corresponding update to `memory/context-anchor.md` or `memory/goals-master.md`, flag and force an anchor update.

### Layer D — Duplicate / collision audit (daily)
Catches:
- duplicated cron commands
- duplicate schedules+delivery targets
- shared state-file collisions (`memory/*.json` referenced by multiple jobs)

### Layer E — Repo safety invariants (continuous)
Catches:
- default branch drift away from `main`
- local branches with no upstream that break backups
- uncommitted deletions (prevent auto-sync from pushing accidental deletes)

---

## Non-Drift Invariants (must always hold)

### Repos
- Every repo has a stable default branch: **`main`**.
- Feature work is on `feat/...` branches.

### Backups
- Hourly auto-sync must never fail due to missing upstream.

### Messaging
- Business/public surfaces must never get spammed by diagnostic jobs.

---

## Incident Response

When an alert fires:
1) Determine if it’s a **real failure** vs a **reporting/timeout artifact**.
2) Contain:
   - disable duplicate/noisy job if needed
   - prevent partial outputs from overwriting (write to new file + atomic rename)
3) Fix:
   - smallest safe fix
4) Update anchors:
   - record the decision + why + what changed

---

## What “Good” Looks Like
- No job fails silently for more than 60 minutes.
- No major workflow changes without a written anchor.
- No duplicate jobs posting the same output.
- LabStudio + revenue apps have scheduled build capacity that doesn’t require manual reminders.
