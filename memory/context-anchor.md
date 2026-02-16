# Context Anchor — 2026-02-16 (Mon 12:02pm ET) — internal

## Top 10 commitments (master)
- Courts + kids/school rights monitoring is Sev-1: never miss emails; summarize + **draft-only** replies.
- Reduce friction: if ≥70% sure, decide + execute; only ask when safety/irreversible/costly.
- **Draft-first for all outbound email**; explicit rule: **do NOT email Karen back**.
- North star: make money + increase efficiency/throughput (revenue-first automations).
- TYFYS: keep Zoho + RingCentral automations reliable (no silent failures).
- TYFYS: accurate daily operational reporting + sales performance visibility.
- TYFYS: RingCentral migration stabilization (chatId/token rotation) + scheduled posts succeed.
- TYFYS: inbound SMS routing/forwarding to correct sales rep by Zoho Lead owner.
- LabStudio: **DONE (ultimate)** = fully polished, all functions working 100% as intended; App Store-ready.
- LabStudio: **NO mock data** in user-visible UI (DB/integration-backed only; seeding OK if it writes to DB).

## Today’s non-negotiables (Mon)
- **Custody reality:** Richard does NOT have kids Mon/Tue.
- **Courts/school watch:**
  - Email watch (courts + schools) **4:40pm ET** (jobId `f110cf0a-fad5-4fb0-afc5-1445be871215`) — fast 2-query scan + summarize + draft-only.
  - Daily 6am ops scan + 7:30am watch already exist; continue treating as Sev-1.
- **Backups:**
  - Hourly repo auto-sync at **:05** (jobId `d43e5f81-9be4-43ff-8e6d-bc8082ef99ab`).
  - Nightly OpenClaw state backups **2:30am + 2:40am** (jobIds `188a18be-88ee-4b81-95e0-8e7d1a9a236a`, `854bc3fc-30b3-49c4-a0f3-b9f79153a307`).
- **RingCentral updates (Sales Team):**
  - Weekday AM posts (8:30/8:32/8:35/8:40) + **4:00pm ET Day Cap** (jobId `08f00dea-1aa3-41d0-8ae2-319118b13e02`).
  - Inbound/outbound SMS automations during send windows (jobs `786870c7-…`, `0aa2a6d7-…`, `12384d05-…`).

## Active workstreams + next actions
### 1) Rights-critical monitoring (courts/school)
- Next: ensure 4:40pm watch runs clean; if any hit has dates/deadlines, summarize + draft reply immediately.

### 2) TYFYS reliability + throughput (Zoho + RingCentral)
- Next: keep RC scheduled posts + SMS automations green.
- If any `invalid_grant`: refresh tokens per-user (NEW tenant) via:
  - `node scripts/tyfys/ringcentral-oauth-refresh-token-per-user.mjs --tenant new --user <richard|devin|adam|amy|jared>`
- Continue hygiene routines: timezone-from-zip backfill; duplicate lead scan.

### 3) LabStudio end-to-end “done”
- Next: ship reliability fixes that make flows member-usable: cafe/booking/shop/cart/add-to-cart/checkout success states + order persistence.
- Constraint: no mock data in UI.

### 4) Personal organization (“Buy Back Your Time”)
- Next: immediately convert outcomes from today’s touchpoints into tasks:
  - 1:00–1:30 Weekly Touchpoint: Karen
  - 1:30–2:20 Google Ads consult
  - (Overlap risk) 2:00–3:00 CEO Weekly Planning & Review — resolve priority when it becomes actionable.

## Detected breakages + queued fix
### Cron health (last 24h)
- No jobs show `lastStatus=error` within the last 24 hours.

### Older/historical (not active)
- Several **disabled** Everett/KickCraft one-shot jobs failed with `Unsupported channel: whatsapp` (Feb 14).
  - Root cause: delivery routing tried to use WhatsApp instead of Telegram.
  - Queued fix (next work block): if re-enabling similar Everett-topic jobs, force `delivery.channel="telegram"` + explicit `delivery.to="-1003832931510:topic:2"` and avoid WhatsApp defaults.
