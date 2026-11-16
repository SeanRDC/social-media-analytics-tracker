# Backend Phases 4–6 Implementation Plan: Meta, TikTok, LinkedIn, Exports, Weekly Email, Alerts, Push

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every connected platform fills the dashboard; reports export as CSV and print-ready PDF; the weekly email goes out on schedule; alerts arrive by email and web push.

**Architecture:** New fetchers plug into `src/lib/sync/service.ts` (`FETCHERS`). Platforms with daily insight history (Facebook, LinkedIn) return daily rows like YouTube. Platforms that only report current totals (Instagram, TikTok) set `derive: true`; the sync service then writes today's row from the change since the previous sync (followers, and views/engagement summed over each post's change). One pure `buildReport(preset, data)` feeds the CSV route, the print view and the weekly email. A daily job (after sync) sends due weekly emails and evaluates alerts; alerts are recorded once per key so nothing repeats.

**Tech Stack:** Graph API v26.0 (Facebook), Instagram API with Instagram Login, TikTok Display API v2, LinkedIn Community Management API, Resend, `web-push` (VAPID), service worker, Drizzle migration.

**Spec:** `docs/superpowers/specs/2026-11-15-backend-design.md` (phases 4–6), `docs/platforms/api-notes.md`.

## Global Constraints

- Commits: one per feature, repo git identity, no co-author trailers.
- Optional platform reports (demographics, per-post insights) never fail a sync.
- Data contract in `src/lib/data/types.ts` unchanged.
- Without Resend, emails print to the server log; without VAPID keys, the push option is hidden. The app still runs with zero accounts.
- Every Server Action checks the session; the cron route checks `CRON_SECRET`.

## Decisions

- **Facebook:** followers from `followers_count`; daily `page_daily_follows_unique` − `page_daily_unfollows_unique`, `page_media_view`, `page_post_engagements` (90-day chunks); posts from `published_posts` with reactions, comments, shares and `post_media_view`. No demographics (Meta removed Page fan demographics).
- **Instagram:** `followers_count`, recent media with like/comment counts and `views`/`shares`/`saved` insights; demographics from `follower_demographics` (age, country, gender; 100+ followers). Derived daily rows.
- **TikTok:** `follower_count`, `likes_count`, `video_count`; `video/list` with view/like/comment/share counts. Derived daily rows; no demographics.
- **LinkedIn:** total from `networkSizes`; daily follower gains and share statistics (impressions as views); posts from `/rest/posts` with per-post share statistics. No age demographics.
- **PDF:** a print-ready page (`/reports/print/[preset]`) that opens the browser's Save as PDF; no PDF library.
- **Weekly email timing:** due once the saved weekday and hour have passed in the saved time zone and it hasn't gone out since; the daily cron sends it at the next run (Vercel Hobby runs crons daily; on Pro the cron can run hourly for exact timing).
- **Alerts:** spike = a post from the last 3 days with at least 2× the median views of recent posts (min 100); milestone = crossing a multiple of 10,000 followers on a platform; drop = engagement rate down more than 20% week over week; reconnect = a connection turned expired.

## Review Focus

- First sync of a derived platform must not report its lifetime views as "today".
- A post deleted on the platform must not produce negative views.
- The weekly email must not send twice in one week, or for someone with nothing imported.
- An expired push subscription (404/410) is removed, not retried forever.
- Exports only ever contain the signed-in user's data.

---

### Task 1: Facebook and Instagram fetchers + derived daily rows (phase 4)
### Task 2: TikTok and LinkedIn fetchers (phase 5)
### Task 3: Report builder, CSV route, print view (phase 6)
### Task 4: Weekly email schedule + sender (phase 6)
### Task 5: Alerts (settings, evaluation, email) and web push (phase 6)
### Task 6: Docs
