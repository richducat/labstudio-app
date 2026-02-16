# Context Anchor — 2026-02-16 (Mon) — internal

## Top 10 commitments (master)
- Courts + kids/school rights monitoring is Sev-1: never miss emails; summarize + draft-only replies.
- Reduce friction: if ≥70% sure, decide + execute; only ask when safety/irreversible/costly.
- Draft-first for *all* outbound email; **do NOT email Karen back**.
- TYFYS: keep Zoho + RingCentral automations reliable (no silent failures).
- TYFYS: accurate daily operational reporting + sales performance visibility.
- TYFYS: RingCentral migration stabilization (chatId/token rotation) + scheduled posts succeed.
- TYFYS: inbound SMS routing/forwarding to correct rep by Zoho Lead owner.
- LabStudio: “done” = member-usable end-to-end (cafe + booking + shop + cart + checkout reliability).
- LabStudio: **NO mock data** in user-visible UI (DB/integration-backed only; seeding OK if DB).
- Buy Back Your Time: time-blocking in GCal + Apple Reminders as task truth; useful morning brief + EOD wrap.

## Today’s non-negotiables (Mon)
- **Custody reality:** Richard does NOT have kids Mon/Tue.
- **Courts/school watch:**
  - Email watch (courts + schools) **4:40pm ET** (jobId f110cf0a-fad5-4fb0-afc5-1445be871215) — fast 2-query scan + draft-only.
  - 6am ops scan + 7:30am watch already exist; continue to treat as Sev-1.
- **Backups:**
  - Hourly repo auto-sync **:05** (jobId d43e5f81-9be4-43ff-8e6d-bc8082ef99ab).
  - Nightly OpenClaw state backups **2:30am + 2:40am** (jobIds 188a18be-88ee-4b81-95e0-8e7d1a9a236a, 854bc3fc-30b3-49c4-a0f3-b9f79153a307).
- **RingCentral updates (Sales Team):**
  - Weekday AM posts (8:30/8:32/8:35/8:40) + **4:00pm ET Day Cap** (jobId 08f00dea-1aa3-41d0-8ae2-319118b13e02).
  - Inbound/outbound SMS automations in send windows (jobs 786870c7-…, 0aa2a6d7-…, 12384d05-…).

## Active workstreams + next actions
### 1) Rights-critical monitoring (courts/school)
- Next action: ensure 4:40pm watch runs clean; if hits, summarize + draft-only replies immediately.

### 2) TYFYS reliability + throughput (Zoho + RingCentral)
- Next action: keep RC scheduled posts + SMS automations green; if any invalid_grant appears, refresh tokens per-user (NEW tenant) using the oauth refresh script.
- Next action: continue data hygiene (timezone-from-zip backfill 10am/4pm; duplicates scan daily).

### 3) LabStudio end-to-end “done”
- Next action: focus on member-usable reliability: cafe/booking/shop/cart/add-to-cart/checkout success states + order persistence.
- Constraint: no mock data in UI.

### 4) Personal organization (Buy Back Your Time)
- Next action: convert today’s meeting outcomes into tasks immediately after each touchpoint.
- Note: Calendar shows overlap (Ads consult vs CEO planning); resolve priority when surfaced.

## Detected breakages / risks + queued fix
### Cron health (last 24h)
- No cron jobs show `lastStatus=error` within the last 24 hours.

### Known historical breakage (older than 24h, not currently active)
- Several **disabled** Everett/KickCraft one-shot jobs failed with `Unsupported channel: whatsapp` (Feb 14). Root cause: delivery routing tried to use whatsapp instead of telegram.
  - Queued fix (next work block): if we ever re-enable similar “Everett topic” jobs, ensure `delivery.channel="telegram"` and `delivery.to="-1003832931510:topic:2"` explicitly (and remove/avoid whatsapp defaults).
