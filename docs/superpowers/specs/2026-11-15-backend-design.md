# Backend Design

Date: 2026-11-15 · Status: approved by product owner (recommendations accepted)

## Intent

Replace the front end's sample data with real numbers from the platforms people connect, without changing the UI. Every page already reads through `src/lib/data/api.ts`; the backend fills those functions in.

## Decisions (owner)

| Decision | Choice |
|---|---|
| Hosting | Vercel (Next.js) + Neon Postgres |
| Architecture | Next.js full stack: route handlers, server actions, background jobs |
| Accounts | Single user per account for v1 (no teams or client workspaces) |
| First platform | YouTube end to end, then Meta (Facebook, Instagram), TikTok, LinkedIn |
| X | Out of scope for now (paid API) |
| "Live viewers right now" card | Replaced by "Views per day, this week vs last week" |

## Approaches considered

1. **Next.js full stack + Postgres + background jobs** (chosen). One codebase and deploy; the existing data layer becomes the seam.
2. Supabase-first (auth, database, cron in one service). Fewer moving parts, more vendor coupling; platform OAuth still custom.
3. Separate API service (NestJS or FastAPI). Most control, two deploys; more than v1 needs.

## What the platforms provide (verified 2026-11-15, see `docs/platforms/api-notes.md`)

- No platform offers "viewers right now" outside YouTube live streams, hence the card change.
- Most APIs return only today's follower count, so **we snapshot daily** and build history ourselves. YouTube Analytics can backfill daily history; Instagram insights reach back about 30 days.
- Audience demographics exist for YouTube, Instagram (100+ followers) and LinkedIn pages; not for TikTok's Display API. The Audience page will say which platforms the numbers come from.
- "Best time to post" is computed from the account's own posts by weekday and hour.

## Architecture

```
Next.js on Vercel
 ├─ pages → src/lib/data/api.ts → database (UI unchanged)
 ├─ /api/auth/*                 app sign-in (Better Auth)
 ├─ /api/connect/[platform]/*   platform OAuth start + callback   (phase 2)
 ├─ server actions              disconnect, alerts, schedules, exports
 └─ /privacy /terms /data-deletion   required by platform reviews
Postgres: Neon in production, PGlite (embedded) for local development and tests
Jobs (phase 2+): first import, daily snapshot, token refresh, alerts, weekly email
```

- **App sign-in:** Better Auth (the Auth.js maintainers now recommend it for new projects) with email magic link, Google and Apple. Sessions live in the database.
- **Route protection:** an optimistic cookie check in `src/proxy.ts`, plus a server-side session check in a Data Access Layer behind Suspense (Next.js 16 Cache Components rule: request data never blocks a layout).
- **Platform tokens** (phase 2): encrypted with AES-256-GCM before storage; key from the environment.
- **Data model:** `user`, `session`, `account`, `verification` (auth); `connection`, `daily_stat`, `post`, `post_stat`, `audience_stat`, `alert_setting`, `report_schedule`.

## Phases

| # | Phase | Status |
|---|---|---|
| 0 | Verify APIs; developer-app checklist; privacy, terms, data-deletion pages; align the front end's data contract | done |
| 1 | Database, schema, migrations, real sign-in, protected routes, deployment readiness | done |
| 2 | Connection framework (OAuth, encrypted tokens, refresh, statuses) | done (2026-11-16) |
| 3 | YouTube end to end | done (2026-11-16) |
| 4 | Facebook + Instagram | done (2026-11-16) |
| 5 | TikTok, LinkedIn | done (2026-11-16) |
| 6 | Exports, weekly email, alerts, push | done (2026-11-16) |
| 7 | Hardening | later |

## Non-goals (this round)

Platform OAuth, sync jobs, real stats, exports, email delivery. Pages keep sample stats until phase 3, but the signed-in user and session are real.

## Left to the builder

Library versions, file layout inside the structure above, exact table columns beyond the listed entities.
