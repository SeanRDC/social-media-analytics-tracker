# Backend Phase 3 Implementation Plan: YouTube End to End

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A connected YouTube channel fills the dashboard with its own numbers: a first import with daily history, a daily sync, and every `api.ts` function answering from the database. People with nothing imported keep seeing labelled sample data.

**Architecture:** A per-platform *fetcher* returns a normalised `PlatformSnapshot` (current followers, daily rows, posts with lifetime stats, audience shares). A sync service writes snapshots idempotently (upserts keyed by connection + date / post) and records `last_synced_at`. A pure *compute* module turns stored rows into the existing contract types (`Overview`, `DailyViews`, `Platform`, `Post`, `Audience`), so the UI does not change. `api.ts` picks the source per signed-in user: imported data when any connection has synced, otherwise sample data. The landing page keeps the sample data on its own module.

**Tech Stack:** YouTube Data API v3, YouTube Analytics API v2, Drizzle, Next.js Server Actions, Vercel Cron, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-15-backend-design.md` (phase 3), `docs/platforms/api-notes.md` (YouTube).

## Global Constraints

- Commits: one per feature, repo git identity, no co-author trailers.
- The data contract in `src/lib/data/types.ts` stays as is (optional fields only).
- Dates are ISO `YYYY-MM-DD`. "As of" is the latest stored day (YouTube Analytics lags about two days), not the wall clock.
- Imports are idempotent: running the same sync twice changes nothing.
- Simulated connections (local development) get generated history, so the whole pipeline is visible without credentials; the dashboard says so.

## Decisions

- **History:** first import backfills 180 days (90-day range plus the previous 90 for change percentages). Later syncs re-read from three days before the last sync to pick up late data.
- **Followers per day:** YouTube reports daily net subscriber change; daily totals are rebuilt backwards from today's subscriber count.
- **Posts:** the 200 most recent uploads. A video of 3 minutes or less counts as a Short (YouTube's current limit); the Data API has no Shorts flag.
- **Engagement:** (likes + comments + shares) / views, as a percentage.
- **Best time to post:** average views of the account's own posts by weekday and time slot (UTC), scaled so the best cell is 1.
- **Daily views card:** the last 7 stored days against the 7 before them.

## Review Focus

- A channel with no uploads, no demographics (small channels) or all-zero days must render without dividing by zero or crashing (Audience page, growth bars, views chart).
- An expired YouTube token during sync marks the connection expired and does not abort syncing other connections.
- Disconnecting a platform removes its numbers from every page immediately.
- The landing page keeps its sample preview for signed-out visitors.
- A partially failing import (e.g. demographics 403) still stores the rest.

---

### Task 1: YouTube fetcher — `src/lib/sync/types.ts`, `src/lib/sync/youtube.ts`, `src/lib/sync/simulated.ts`
- `fetchYouTube(accessToken, { start, end }): Promise<PlatformSnapshot>` (channel, uploads, videos, analytics by day, by video, age/gender, country).
- `simulatedSnapshot(platform, { start, end }, seed)`: deterministic generated history.
- Tests (stubbed fetch): followers rebuilt backwards; Shorts by duration; engagement inputs; demographics optional on 403.

### Task 2: Sync service and jobs — `src/lib/sync/service.ts`, `src/app/actions/sync.ts`, `src/app/api/cron/daily/route.ts`
- `syncConnection(db, connectionId, now)`, `syncAll(db, now)`; `importPlatform(platform)` Server Action; daily cron refreshes tokens, then syncs (replaces `/api/cron/refresh-tokens`).
- Tests (PGlite): first import window 180 days; re-sync is idempotent; expired token marks expired and continues; `last_synced_at` set.

### Task 3: Compute and live reads — `src/lib/data/compute.ts`, `src/lib/data/live.ts`
- Pure functions from rows to `Overview`, `DailyViews`, `Platform[]`, `Post[]`, `Audience`.
- Tests: the same consistency rules the sample data obeys (totals, growth sums, trend ends at followers, daily views sum to 7-day views, shares sum to 100), plus empty and zero cases.

### Task 4: Wire the data layer and UI
- `api.ts` reads per user; `sample-api.ts` for the landing page; `getDataSource()` drives the shell notice; zero-safe growth bars and views chart; Audience empty state; real thumbnails and "Open on YouTube".
- Onboarding import page runs `importPlatform` for each platform with real progress; Settings imports right after a connection.

### Task 5: Docs — README, setup checklist, API notes, spec status.
