# Context Anchor — 2026-02-16 (Mon) — 08:42 ET

## Top 10 commitments (keep me honest)
- Courts + kids/school rights monitoring is Sev-1: never miss emails; summarize + **draft-only** replies.
- **Draft-first for all outbound** until explicitly approved; **do NOT email Karen back**.
- Reduce friction: if ≥70% sure, decide + execute; only ask when safety/irreversible/costly.
- TYFYS: stabilize + increase throughput of Zoho + RingCentral automations (reliability first).
- TYFYS: accurate daily reporting + sales performance visibility (rep-safe where required).
- TYFYS: RC migration stabilization (tokens/chatId routing) so scheduled posts succeed.
- TYFYS: inbound SMS forwarding to correct sales rep by Zoho Lead owner.
- LabStudio: “done” = member-usable end-to-end (cafe + booking + shop + cart + checkout).
- LabStudio: **NO mock data** in user-visible UI (DB/integration-backed only; seeding OK if it writes DB).
- Backups: keep hourly git auto-sync + nightly OpenClaw state bundle working.

## Today’s non-negotiables
- **Custody baseline:** Mondays/Tuesdays = mom has the kids (no pickup).
- **Courts + school email watch**
  - 4:40pm ET: courts/school watch cron (jobId f110cf0a-fad5-4fb0-afc5-1445be871215)
  - (Also 7:30am ET watch exists; already scheduled daily)
- **Backups**
  - Hourly backup auto-commit/push (jobId d43e5f81-9be4-43ff-8e6d-bc8082ef99ab)
  - Nightly OpenClaw state bundle → Drive + local sync (jobIds 188a18be-88ee-4b81-95e0-8e7d1a9a236a, 854bc3fc-30b3-49c4-a0f3-b9f79153a307)
- **RingCentral scheduled updates (weekday)**
  - 8:30am ET Morning Sales Team RC Update (cf636099-5635-427e-89c4-ef75d48b9d55)
  - 8:32am ET lead buckets (bd09ab42-9b14-4e1e-b844-a89bf6e9086e)
  - 8:35am ET KPI scoreboard (728172ee-2e2e-4c5e-be97-5af59a3cffd6)
  - 4:00pm ET Day Cap update (08f00dea-1aa3-41d0-8ae2-319118b13e02)

## Active workstreams + next actions
### Rights-critical monitoring
- Keep cron jobs fast + reliable; draft-only replies.
- If any court/school hit shows a deadline: create draft reply + add an immediate reminder.

### TYFYS (reliability + throughput)
- Maintain: inbound SMS forwarder + provider replies watch + fulfillment/provider taskers.
- Next action: if any RC/Zoho job outputs zeros or errors, investigate auth/token + paging first; keep fixes minimal.

### LabStudio ship block
- Focus: end-to-end member flows (cafe/booking/shop/cart/checkout) + persistence + success states.
- Next action: when work block opens, pick 1 “member journey” bug and push through to local green with test steps + PR-ready writeup.

### Personal organization
- Keep time-blocking + Apple Reminders as task truth; convert meetings into immediate next steps.

## Detected breakages (cron health)
- **Enabled jobs with lastStatus=error in last 24h:** none detected.
- Historical (older) errors spotted (disabled one-shots): several Telegram-topic test jobs failed with `Unsupported channel: whatsapp` (Feb 14). No action needed unless those are re-enabled.

## Fix queue (apply on next available work block)
- If any Telegram delivery is intended, ensure delivery.channel is explicitly `telegram` and the runtime channel mismatch isn’t used for those one-shot tests (avoid reintroducing `Unsupported channel: whatsapp`).
