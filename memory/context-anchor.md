# Context Anchor — 2026-02-16 (Mon) — 08:22 ET

## Top 10 commitments (what we do *no matter what*)
1) **Courts + school monitoring is Sev-1**: never miss rights-critical email; summarize + draft-only replies.
2) **Draft-first outbound everywhere** unless Richard explicitly approves send.
3) **Do not email Karen back** (draft-only; route/prepare, don’t send).
4) **Reduce friction**: if ≥70% sure, decide + execute; only ask for safety/irreversible/costly ambiguity.
5) **TYFYS automation reliability**: Zoho + RingCentral jobs must run daily without silent failure.
6) **Inbound SMS forwarding**: route inbound replies to correct rep line (by Zoho Lead owner) without client-facing mistakes.
7) **Provider reply monitoring**: catch doctor/provider responses quickly and tee up next actions.
8) **Backups**: hourly git auto-sync + nightly OpenClaw state bundle (Drive + local sync).
9) **LabStudio “member-usable end-to-end”**: cafe + booking + shop + add-to-cart/cart + checkout must work reliably; **no mock data** in UI.
10) **Keep changes PR-sized + reviewable**: create PR-ready work; do not push live; Richard tests/commits.

## Today’s non-negotiables (Mon)
- **Custody / kids**: Mondays/Tuesdays = kids with mom (no pickup).
- **Courts/school watch**:
  - 7:30am email watch (jobId `0a9c010d-...`) already scheduled.
  - 4:40pm email watch (jobId `f110cf0a-...`) scheduled.
- **RingCentral updates (weekday AM cadence)**:
  - 8:30am Morning Sales Team RC update (`cf636099-...`)
  - 8:32am lead buckets (`bd09ab42-...`)
  - 8:35am KPI scoreboard (`728172ee-...`)
  - 8:40am DriftGuard verification (`b925e5db-...`)
- **Backups**:
  - Hourly git auto-sync at :05 (`d43e5f81-...`)
  - Nightly OpenClaw state backup to Drive 2:30am (`188a18be-...`) + local sync 2:40am (`854bc3fc-...`)

## Active workstreams + next actions
### Rights-critical (courts + school)
- Next action: keep the 4:40pm watch FAST (2 queries, max 10 each) and draft-only if needed.

### TYFYS (ops + sales reliability)
- Keep cron pipeline green through business hours:
  - inbound SMS forward-to-owner every 30m (jobId `12384d05-...`) — **Jared excluded** by design.
  - provider replies watch 9/1/5 (jobId `b9db713f-...`).
  - fulfillment tasker 8:45am (jobId `dfeef5d2-...`) + provider handoff tasker 1:45pm (jobId `e7052083-...`).
- Next action: if any RC/Zoho script errors today, smallest safe fix first (token refresh, extend timeout, reduce scope) and log to this file.

### LabStudio
- Goal: “done” = member-usable end-to-end (cafe/booking/shop/cart/checkout). Stripe entitlement/webhooks can be last.
- Next action: schedule an afternoon ship block after meetings; keep changes PR-sized (<400 net lines) with test steps.

### Personal organization
- Next action: convert outcomes from today’s meetings (Morning Sync, Ammar, Karen, Ads consult) into concrete next tasks immediately (Reminders/Second Brain).

## Cron health (quick check)
- **Enabled jobs w/ lastStatus=error in last 24h:** none detected from the current cron list.
- **Notable historical errors (outside 24h, disabled one-shots):**
  - Several KickCraft/Everett Telegram-topic posts failed with `Unsupported channel: whatsapp` (jobIds `df8f1ae3-...`, `464cbf82-...`, `806bdedf-...`, `0338f6fa-...`).

## Detected breakages + queued fixes (apply next work block)
1) **Broken delivery channel on old KickCraft/Everett one-shot jobs**
   - Symptom: `Unsupported channel: whatsapp` despite Telegram `to` target.
   - Likely cause: job ran in a WhatsApp-bound session / delivery.channel not explicitly set to `telegram`.
   - Fix to apply next: if we ever resurrect these, set `delivery.channel="telegram"` explicitly and ensure they run in a Telegram-capable session; otherwise delete the dead one-shots to reduce noise.

---
Last refreshed by context-anchor cron.
