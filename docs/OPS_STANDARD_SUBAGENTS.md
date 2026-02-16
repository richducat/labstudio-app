# Ops Standard: Parallel Lanes + Work Orders (Sub-Agents)

Purpose: stop projects from hanging, stop zombie recurring “restart the project” jobs, and make progress visible + shippable.

## Definitions
- **Track A (Reliability):** recurring checks + automations that keep life/business from breaking.
- **Track B (Shipping):** finite build work that must end in a PR (or an explicit blocked state).
- **Work Order:** a single scoped unit of Track B work executed by a sub-agent lane.

## Core Rules (non-negotiables)

### A) Reliability work must not start projects
Track A jobs:
- must be deterministic and short
- must be **alert-only** when healthy
- may create Work Orders, but may not run open-ended build sessions

### B) Shipping work must end clean
Every Work Order must end in exactly one state:
- **PR_READY** (branch+PR with test steps)
- **BLOCKED** (reason + next action + owner)
- **CANCELED** (why)

No “we’ll get back to it” without a recorded state.

### C) WIP limits
- Max **2 active Work Orders per project**.
- Max **4 active Work Orders total**.

### D) Aging protection
- Any Work Order > **48h** without progress triggers an alert.

### E) Daily shipping minimum
- At least **1 Work Order advances daily** (PR opened/updated, or blocked resolved).

## Sub-Agent Lanes
- Each Work Order spawns a sub-agent with a single mission and a timeout.
- The sub-agent produces a branch/PR + test steps + a short log entry to anchors.

## Deployment Policy (default)
- **Default deploy target is Production** once a Work Order reaches PR_READY and passes its test steps.
- Preview deployments may still be used when helpful, but are not required.
- Guardrails still apply (no destructive ops without care; no external messaging without policy compliance).

## No-Pause Rule (momentum)
- There is **never** a “pause and wait” moment.
- If there is an obvious next action that is safe and on-mission, **do it immediately**.
- If the next action is unclear or has multiple plausible directions, **ask Richard immediately** (one tight question), then proceed.

## Visibility
- Control Room shows:
  - Active Work Orders
  - Stuck Work Orders
  - Latest PR per project
  - Latest deployments

## Sources of truth
- `memory/goals-master.md` (priorities + definitions)
- `memory/context-anchor.md` (today + active work orders)
- `docs/OPS_STANDARD_SUBAGENTS.md` (this contract)
