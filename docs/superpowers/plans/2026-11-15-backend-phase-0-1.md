# Backend Phase 0–1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Groundwork for real data: verified API notes and owner checklist, legal pages, a front-end data contract that matches what platforms provide, a Postgres schema with migrations, and real sign-in with protected routes.

**Architecture:** Drizzle ORM over Postgres (Neon in production through `postgres`, embedded PGlite locally and in tests when `DATABASE_URL` is unset). Better Auth with its Drizzle adapter, magic-link plugin and optional Google/Apple providers, mounted at `/api/auth/[...all]`. `src/proxy.ts` redirects requests without a session cookie; a `server-only` Data Access Layer validates the session behind Suspense.

**Tech Stack:** Next.js 16, Drizzle ORM + drizzle-kit, postgres, @electric-sql/pglite, better-auth, Resend (optional), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-15-backend-design.md`

## Global Constraints

- Commits: one per feature, repo git identity, no co-author trailers.
- No secrets in the repo; every variable documented in `.env.example`.
- Session reads never block a layout (Cache Components): DAL calls sit behind Suspense.
- App runs locally with zero external accounts (PGlite + console-logged sign-in links).

## Review Focus

- Unauthenticated visits to `/overview` (and other app pages) must land on `/sign-in`, keeping the intended destination.
- Signed-in visitors to `/sign-in` should not be stuck on the form.
- Missing Google/Apple credentials must hide those buttons, not throw.
- Magic links must work locally without an email provider.
- Sign out must clear the session and return to `/sign-in`.

---

### Task 1: Phase 0 docs (API notes, setup checklist, design, plan) — commit `docs: ...`
### Task 2: Legal pages `/privacy`, `/terms`, `/data-deletion` — commit `feat: add privacy, terms and data deletion pages`
### Task 3: Data contract alignment
- Replace `LiveViewers` with `DailyViews { days: string[]; thisWeek: number[]; lastWeek: number[] }`; `getDailyViews()`; card becomes "Views per day".
- Onboarding copy: "as much history as each platform allows"; Audience page notes data sources.
- Tests updated first. Commit `feat: align data contract with what platforms provide`.
### Task 4: Database
- `src/db/schema.ts` (auth tables + app tables), `src/db/index.ts` (driver switch), `drizzle.config.ts`, generated migrations, `npm run db:generate|db:migrate`.
- Test: migrations apply on PGlite; insert + read a `daily_stat` row; unique (connection, date).
- Commit `feat: add Postgres schema and migrations with Drizzle`.
### Task 5: Auth
- `src/lib/auth.ts` (server), `src/lib/auth-client.ts`, route `/api/auth/[...all]`, `src/proxy.ts`, `src/lib/dal.ts` (`getCurrentUser`), sign-in form wired (magic link + optional social), "check your email" state, sign out, header/settings use the real user.
- Tests: proxy redirects; sign-in form calls magic link; providers hidden when unconfigured.
- Commit `feat: add sign-in with magic links and protected routes`.
### Task 6: Deployment readiness
- `.env.example`, README backend section, verify `npm run build` with and without `DATABASE_URL`. Commit `docs: document environment and deployment`.
