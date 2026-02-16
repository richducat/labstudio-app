# Context Anchor (auto-updated)

Updated: 2026-02-16 09:02 ET

## Top 10 commitments (keep me honest)
1) **Courts + kids/school rights monitoring is Sev-1**: never miss emails; summarize + draft-only replies.
2) **Draft-first outbound policy**: do NOT send emails unless explicitly approved; draft-only simple replies for everyone.
3) **Do NOT email Karen back** (drafts ok; no sending).
4) **Friction rule**: if ≥70% sure, decide + execute; only ask when safety/irreversible/costly uncertainty.
5) **TYFYS reliability + throughput**: Zoho + RingCentral automations must be stable and low-noise.
6) **RingCentral scheduled updates must succeed** (morning + lead buckets + KPI + EOD day-cap).
7) **Provider reply monitoring**: ensure doctor/provider inbound doesn’t get missed.
8) **LabStudio “done” = member-usable end-to-end** (cafe + booking + shop + cart + checkout flows). No mock data in user-visible UI.
9) **Backups/continuity**: hourly git auto-sync; nightly OpenClaw state bundle backups.
10) **Buy back time / personal organization**: time-blocking; reminders as task truth; daily brief + EOD wrap that actually helps.

## Today’s non-negotiables (Mon 2026-02-16)
### Courts / school
- Kids are **NOT** with Richard on Mondays/Tuesdays.
- Email watch (courts + schools):
  - 7:30am ET job (0a9c010d-…) — already scheduled.
  - **4:40pm ET** job (f110cf0a-…) — act immediately on any deadlines; draft-only replies.
- Daily 6:15am ops inbox scan (c3567b07-…) and 6:00am day prep prompt (7e26d773-…): maintain.

### Backups / continuity
- Hourly backup: git auto-sync-all at :05 (d43e5f81-…).
- Nightly OpenClaw state backups: 2:30am + 2:40am (188a18be-… / 854bc3fc-…).
- Nightly markdown audit: 3:15am (60979461-…).

### RingCentral (RC) updates
- Morning RC Sales Team update: 8:30am ET (cf636099-…).
- Lead buckets RC update: 8:32am ET (bd09ab42-…).
- KPI scoreboard RC update: 8:35am ET (728172ee-…).
- DriftGuard verification: 8:40am ET (b925e5db-…).
- Day-cap RC update: 4:00pm ET (08f00dea-…).

## Active workstreams + next actions
### 1) Rights-critical monitoring (courts/school)
- Next: keep the 4:40pm watch fast + reliable (2 searches, 10 results each); draft-only if reply needed.

### 2) TYFYS automation reliability (Zoho + RC)
- Next: keep inbound SMS forwarder (12384d05-…) + inbound auto-reply scanner (786870c7-…) stable; watch for invalid_grant → refresh tokens per-user.
- Next: maintain provider replies watch (b9db713f-…) 9/1/5 ET.

### 3) LabStudio ship block (member-usable end-to-end)
- Next: prioritize reliability fixes in cafe/booking/shop/cart/checkout flows; avoid UI mock data.
- If prod mismatch: use Vercel CLI workflow (npx vercel --prod --yes) and author rewrite runbook if needed.

### 4) Personal organization / time blocking
- Next: convert today’s meetings into tasks immediately after each call (Morning Sync, Ammar, Karen, Ads consult, etc.).

### 5) OpenClaw drift prevention
- Next: keep DriftGuard preflight + error sentinel effective; minimize redundant jobs.

## Cron health quick check (last 24h)
- **No enabled jobs showing lastStatus=error in the last 24h** (based on current cron list).

## Detected breakages / queued fixes
- Historical (2026-02-14) errors on several *disabled* one-shot Telegram-topic pings: `lastError: Unsupported channel: whatsapp`.
  - Queued fix: if we ever re-enable these, ensure `delivery.channel="telegram"` (or omit channel but ensure correct routing) and confirm the session/channel context isn’t WhatsApp.

## Next “fix block” (when a work block opens)
- Clean up / remove the disabled, errored one-shot cron jobs to reduce noise/confusion (optional).
- Verify RC post verification job is actually checking what reps see (dry-run outputs are non-empty and post scripts have correct tenant/new).
