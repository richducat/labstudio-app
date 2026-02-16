# Context Anchor (internal)

Last updated: 2026-02-16 13:02 ET

## Top 10 commitments (north-star list)
1) **$10k/week** outcome focus: revenue-first, remove bottlenecks.
2) **Courts + school monitoring is Sev-1** (rights-critical): never miss; summarize; **draft-only** replies.
3) **Draft-first outbound policy**: do not send emails/messages unless explicitly approved.
4) **Do NOT email Karen back** (draft-only; route via Richard).
5) **Friction rule**: if ≥70% sure, decide + execute; ask only for safety/irreversible/costly ambiguity.
6) **TYFYS reliability + throughput**: keep Zoho + RingCentral automations stable; prevent drift/duplicate jobs.
7) **RingCentral migration stability**: token rotation, scheduled posts succeed, inbound routing works.
8) **LabStudio “DONE” = member-usable end-to-end** (cafe + booking + shop/cart/checkout) with **no mock user-visible data**.
9) **Backups + continuity**: hourly git auto-sync + nightly OpenClaw state backups must stay green.
10) **GitHub hygiene**: key repos default branch must be `main` (no feature branch as default).

## Today’s non-negotiables (Mon 2026-02-16)
- **Kids/courts/school**
  - Kids: **never have kids Mon/Tue** (today = not with Richard).
  - Courts/school email watch: 7:30am + **4:40pm ET** jobs (draft-only).
- **Backups**
  - Hourly: git auto-sync all repos (5 past the hour).
  - Nightly: OpenClaw state bundle → Drive + local Drive sync.
- **RingCentral updates (rep-safe)**
  - Morning RC posts (8:30–9:00am ET block): sales team update + lead buckets + KPI scoreboard + verification.
  - Day-cap RC post (4:00pm ET): EOD update.
- **Provider replies watch** (9/13/17 Mon–Sat): notify only, no outbound.

## Active workstreams + next actions
### 1) Rights-critical monitoring (courts + school)
- Keep the email-watch jobs reliable and fast; draft-only replies.

**Next action:** be ready to act immediately after the 4:40pm ET watch if anything has deadlines.

### 2) TYFYS ops automations (Zoho + RingCentral)
- Inbound SMS auto-reply scanner (enabled): keep green; if invalid_grant → refresh per-user tokens.
- Outbound SMS autopilot (enabled): monitor state file + quiet hours; ensure not spamming.
- Inbound SMS forward-to-owner (enabled): Jared intentionally excluded; keep stable.
- Provider handoff + fulfillment taskers: systemEvent reminders (manual run when prompted).
- Data hygiene: timezone backfill (10am/4pm) + duplicate lead scan (9:35am).

**Next action:** if any RC job throws invalid_grant, immediately re-auth NEW tenant for the specific user via `ringcentral-oauth-refresh-token-per-user.mjs` and re-run the failed job.

### 3) LabStudio build (autonomous blocks)
- Scheduled build blocks: 11:00am, 2:00pm, 5:00pm ET weekdays.
- Goal: fully working member flows (cafe + booking + shop/cart/checkout), no mock UI data.

**Next action:** continue from latest LabStudio branch/PR; prioritize end-to-end cart + success states + booking sanity; run `pnpm build`.

### 4) Personal organization / buy back time
- Time-blocking via Google Calendar.
- Tasks truth = Apple Reminders.

**Next action:** convert touchpoints (Ammar/Karen) into concrete next steps immediately after meetings.

## Cron health (last 24h)
- **Enabled jobs w/ lastStatus=error in last 24h:** none detected.

## Detected breakages / drift risks (queued fixes)
1) **Stale one-shot Everett/KickCraft Telegram jobs failed (Feb 14) with `Unsupported channel: whatsapp`**
   - Not last-24h, but indicates a delivery/channel mismatch in those one-shot jobs.
   - **Fix (next available work block):** delete these stale disabled one-shot jobs to reduce noise. If we ever need them again, re-create with explicit `delivery.channel="telegram"`.

2) **Calendar overlap risk (informational)**
   - Ads consult overlaps CEO Weekly Planning (2:00–3:00pm vs 1:30–2:20pm).
   - **Fix (next available work block):** decide priority and adjust calendar blocks so nothing gets missed.
