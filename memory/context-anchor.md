# Context Anchor (auto-updated)

Last updated: 2026-02-16 11:22 ET

## Top 10 commitments (non-negotiable anchors)
1) **Courts + school monitoring (rights-critical):** never miss; summarize; draft-only replies.
2) **Draft-first outbound policy:** do not send emails/messages unless explicitly approved; *never email Karen back*.
3) **Low-friction operating mode:** if ≥70% sure, decide + execute; avoid clarifying-question churn.
4) **TYFYS ops reliability:** Zoho + RingCentral automations stable; reduce silent failures.
5) **TYFYS daily operational reporting:** rep-safe posts; sales performance visibility.
6) **RingCentral migration stabilization:** token/chatId/tenant “new” scripts stay green.
7) **Inbound SMS routing:** forward inbound replies to the correct rep (Zoho Lead owner), avoid misroutes.
8) **LabStudio ‘DONE’ definition:** cafe + booking + shop + cart + checkout member-usable end-to-end.
9) **LabStudio data rule:** no mock data in user-visible UI (DB/integration-backed only).
10) **Backups/continuity:** automated git auto-sync + OpenClaw state backups stay healthy.

## Today’s non-negotiables (Mon 2026-02-16)
- **Kids/custody:** Mondays/Tuesdays = kids with mom (per 2026-02-16 plan). Still treat school/court comms as Sev-1.
- **Courts/school email watch:**
  - 4:40pm ET: Email watch (courts + schools) jobId `f110cf0a-fad5-4fb0-afc5-1445be871215`.
- **Backups:**
  - Hourly git auto-sync jobId `d43e5f81-9be4-43ff-8e6d-bc8082ef99ab`.
  - Nightly OpenClaw state backups 2:30am/2:40am ET jobIds `188a18be-88ee-4b81-95e0-8e7d1a9a236a`, `854bc3fc-30b3-49c4-a0f3-b9f79153a307`.
- **RingCentral (RC) updates (rep-safe):**
  - AM RC posts: Morning update + lead buckets + KPI scoreboard (weekday jobs; next business day).
  - 4:00pm ET weekday day-cap update jobId `08f00dea-1aa3-41d0-8ae2-319118b13e02`.
  - Ops brief 6:00pm ET Mon–Sat jobId `9c83a94e-b084-4d80-8b6f-aca354bdd87d`.

## Active workstreams + next actions
### Rights-critical comms (courts/school)
- Next action: be ready to act on the 4:40pm ET watch output; if any deadlines, draft replies immediately (no sends).

### TYFYS automation reliability (Zoho + RingCentral)
- Next actions:
  - Keep inbound SMS forwarder green (jobId `12384d05-014d-41ac-a0f3-8913990a2e53`).
  - Keep inbound SMS scanner + outbound autopilot green (jobIds `786870c7-a69b-426c-bd29-3dad3f438003`, `0aa2a6d7-2921-43d7-9242-c7c75c75122d`).
  - Continue drift-guarding cron errors hourly (jobId `db4d77db-27aa-4b35-bfeb-a0c38af3ff30`).

### LabStudio ship-block (member-usable end-to-end)
- Next action: focus on end-to-end reliability for cafe/booking/shop/cart/checkout flows (no mock data). Capture fixes PR-sized; Richard tests/commits.

### Personal organization (“Buy Back Your Time”)
- Next action: keep time-blocking + reminders as truth; convert meeting outcomes (Ammar/Karen touchpoints today) into tasks immediately.

## Cron health (quick)
- **Enabled jobs with lastStatus=error in last 24h:** none detected.

### Notable stale errors (older than 24h, but should be cleaned up)
- Several *disabled* one-shot Telegram-topic test jobs (Feb 14) show `Unsupported channel: whatsapp` (jobIds `df8f1ae3...`, `464cbf82...`, `806bdedf...`, `0338f6fa...`).

## Detected breakages + queued fix (apply next work block)
1) **Cron job definitions with Telegram delivery but error “Unsupported channel: whatsapp”.**
   - Likely cause: wrong `delivery.channel`/routing defaults at time of run or running in a WhatsApp-only context.
   - Fix plan:
     - Remove those disabled one-shot jobs (or update their delivery to explicit `channel:"telegram"` + correct `to`, then re-run if still needed).
     - Confirm gateway messaging config supports telegram in this runtime context; if not, document why.
