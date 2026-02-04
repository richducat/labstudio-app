# TYFYS — Provider sourcing + deal next-step updates (brief)

## What changed in Zoho (Deals)
- **Automation ran (LIVE)** to append a standardized block into each Deal’s **`next_step`** field for pipeline stages:
  - Intake (Document Collection)
  - Ready for Provider
  - Sent to Provider
- **Inference rules**:
  1) Primary: Deal **Attachments** filenames (MDBQ/DBQ/etc)
  2) Backup: Deal **Notes + deal text**
- **Priority order (kept in output)**:
  1) Back/Spine
  2) Neck
  3) Toxic Exposure
  4) PTSD
  5) Mental Health
  6) Sleep Apnea
  …then other inferred needs.
- **What the block includes:**
  - “Inferred needs (priority order)”
  - Portal provider suggestions for the **top 6 needs** (2 providers each) to keep `next_step` readable
  - “Off-limits” reminder (exclude VetLink Solutions, REE Medical, Prestige Veteran)

### Run results
- Deals scanned: **56**
- Deals updated: **53**
- Skipped (no strong needs signal found): **3**
- Report: `memory/portal-provider-next-step-update-2026-02-04.json`

## Provider outreach (email)
- Draft outreach emails were generated from TYFYS portal directory providers who list an email.
- Sent **9** outreach emails (deduped 1 duplicate recipient) from **richard@thankyouforyourservice.co**
- CC’d: **karen@thankyouforyourservice.co**, **devin@thankyouforyourservice.co**

## Where we’re focusing next (states first)
- Pipeline deals are concentrated in these states (based on `Deals.State` + zip where present):
  - Many deals have **missing State** (needs cleanup/backfill)
  - Highest explicit counts: **FL (5), CO (4), GA (4), CA (3), TX (3)**
- State breakdown report: `memory/pipeline-state-needs-2026-02-04.json`

### Important limitation (portal emails)
- The TYFYS portal directory has **~99** providers total, but only **10** list an email address.
- So portal-based outreach won’t scale; we need to expand beyond portal via trusted sources.

## Next actions (status)
1) Backfill missing Deal State values from Zip
   - Status: **DONE (partial)** — only **1** deal had a usable ZIP among the blank-State deals; most are missing ZIP.
   - Script: `scripts/tyfys/backfill-state-from-zip.mjs`
2) Generate next outreach batch prioritizing the most-needed states first
   - Status: **IN PROGRESS** — portal has limited emails; next batch will require web sourcing.
3) Expand beyond portal using trusted directories (state licensing boards + specialty associations), while excluding competitor networks.
   - Status: **NEXT**
