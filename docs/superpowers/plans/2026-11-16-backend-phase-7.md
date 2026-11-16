# Backend Phase 7 Implementation Plan: Hardening

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the system safe to launch: platform calls survive hiccups and quotas, the nightly job scales and can't trip over itself, abuse is rate limited, failures are visible, and people can delete their account themselves.

**Architecture:** Retries live in the shared platform HTTP helpers (`src/lib/connect/providers/oauth.ts`). The nightly job runs under a database lease, records each run, syncs the stalest accounts first with limited concurrency and a time budget, and can be scheduled more than once a day because every step is idempotent. One database-backed fixed-window limiter (`rate_limit` table, shared with Better Auth's database rate-limit storage) guards sign-in, connecting, importing, exports and push sign-ups.

**Spec:** `docs/superpowers/specs/2026-11-15-backend-design.md` (phase 7).

## Global Constraints

- Commits: one per feature, repo git identity, no co-author trailers.
- No new external services required; the failure webhook is optional (`ALERT_WEBHOOK_URL`).
- Never log tokens, emails or other personal data in structured logs (ids only).

## Decisions

- **Retries:** network errors, 429 and 5xx: up to 3 attempts with exponential backoff and jitter, honouring `Retry-After` up to 10 s. Platform quota and rate-limit errors (429, Meta codes 4/17/32/613, YouTube `quotaExceeded`/`rateLimitExceeded`) become `RateLimited`: the account is skipped until the next run, not marked broken.
- **Nightly job:** lease `daily` for 10 minutes; skip accounts already synced today; stalest first; 4 at a time; stop starting new syncs after 4 minutes. Scheduled at 04:00 and 06:00 UTC so the second run finishes what the first couldn't.
- **Per-account errors:** `connection.last_sync_error(_at)`, cleared on success, shown in Settings.
- **Limits:** magic link 5 per 10 min per IP (Better Auth); connect 20/h, import 6/h per platform, export 60/h, push sign-up 20/h per user.
- **Monitoring:** `job_run` table, `/api/health` (database reachable, last nightly run), JSON logs, `onRequestError`, env checks at start-up, optional webhook when a run has failures.
- **Security headers:** nosniff, strict referrer, no framing, permissions policy, HSTS in production.
- **Account deletion:** Settings → Delete account (type your email to confirm): revokes platform access, deletes everything, signs out.

## Review Focus

- Two overlapping nightly runs must not both sync.
- A rate-limited platform must not flip the account to "expired".
- Rate limits must never lock out the cron or one user because of another user.
- Account deletion must revoke platform tokens before deleting them.
- Health endpoint exposes no personal data.

---

### Task 1: Retries and rate-limit handling for platform calls
### Task 2: Nightly job lease, run log, budgeted sync, per-account errors, webhook
### Task 3: Rate limits (Better Auth + app limiter)
### Task 4: Monitoring (health, logs, onRequestError, env checks) and security headers
### Task 5: Delete account
### Task 6: Launch checklist and docs
