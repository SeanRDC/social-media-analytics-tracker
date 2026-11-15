# Graphite Front End Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pitch J "Graphite" front end on sample data, responsive and phone friendly, with the full motion kit.

**Architecture:** Next.js App Router. Pages are server components that call async functions in `src/lib/data/api.ts`; interactive parts are small client components. Styling is CSS Modules on top of global tokens and glass utilities in `src/app/globals.css`. Charts are hand-built SVG from pure geometry helpers.

**Tech Stack:** Next.js (latest), React, TypeScript, CSS Modules, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-11-15-frontend-graphite-design.md`

## Global Constraints

- Commits: one per feature, under the repo's git identity, no co-author trailers.
- Only `transform` and `opacity` animate; everything honours `prefers-reduced-motion` and `prefers-reduced-transparency`.
- Tap targets ≥ 44px on phones; form inputs ≥ 16px font.
- Platform colours and order exactly as in the spec; always paired with the platform name.
- No real network calls; all data comes from `src/lib/data/api.ts`.

## Review Focus

- Range switch (7D/30D/90D) must update every number on Overview, not only the hero strip.
- Count-up must always land on the exact final string, even when animation frames are throttled.
- Sorting the top posts table must be stable and match the menu label.
- Phone layout must keep content clear of the bottom tab bar and the home indicator.
- Charts must stay inside their card at every width (no clipped tooltips at the edges).

---

### Task 1: Scaffold, tokens, glass foundations
**Files:** create-next-app output; `src/app/globals.css`; `src/app/layout.tsx`; `vitest.config.ts`; `public/manifest.webmanifest`.
- [ ] Scaffold with `create-next-app` (TS, ESLint, App Router, `src/`, no Tailwind). Add Vitest, jsdom, Testing Library.
- [ ] Globals: tokens from spec, `.glass`, `.rim`, `.grain`, `.sweep`, reduced-motion/transparency fallbacks, backdrop.
- [ ] `npm run build` passes; commit `chore: scaffold Next.js app with Graphite tokens and glass styles`.

### Task 2: Data layer
**Files:** `src/lib/data/types.ts`, `sample.ts`, `api.ts`; `src/lib/format.ts`; tests `src/lib/__tests__/data.test.ts`, `format.test.ts`.
**Produces:** `Range = 7|30|90`; `PlatformId = 'youtube'|'facebook'|'tiktok'|'linkedin'|'instagram'|'x'`; `getOverview(): Promise<Overview>` with `metrics: Record<Range, Metrics>`; `sortPosts(posts, key: 'views'|'engagement'|'date')`; `formatCompact(n)`.
- [ ] Tests: platform followers sum to 248,600; `sortPosts` orders for each key; `formatCompact(248600) === '248.6K'`, `formatCompact(4900000) === '4.9M'`.
- [ ] Implement; tests pass; commit `feat: add typed sample data layer`.

### Task 3: Motion primitives and chart geometry
**Files:** `src/lib/motion/countUp.ts`, `src/hooks/useCountUp.ts`, `src/hooks/useReducedMotion.ts`, `src/components/motion/Reveal.tsx`, `src/lib/chart.ts`; tests.
**Produces:** `parseCountable(s): {prefix, value, decimals, suffix} | null`; `frameValue(target, t)`; `smoothPath(points, yMin, yMax): string`; `linearScale(domain, range)`.
- [ ] Tests: `parseCountable('+9.8K')`; eased value at t=1 equals target string; `smoothPath` control points clamped.
- [ ] Commit `feat: add motion primitives and chart geometry helpers`.

### Task 4: App shell
**Files:** `src/components/shell/*` (Rail, TabBar, Header, SegmentedControl, RangeProvider, AppShell), `src/components/icons/Icon.tsx`, `src/app/(app)/layout.tsx`.
- [ ] Test: SegmentedControl calls `onChange(7)` when 7D clicked and moves `aria-pressed`.
- [ ] Desktop rail with sliding highlight + tooltips; phone tab bar; header with range control; route-aware active state.
- [ ] Commit `feat: add responsive app shell with rail, tab bar and range control`.

### Task 5: Overview dashboard
**Files:** `src/app/(app)/overview/page.tsx` + `src/components/overview/*` (HeroCard, KpiStrip, LiveViewersChart, GrowthCard, TopPostsTable).
- [ ] Test: TopPostsTable reorders rows when "Most engaging" chosen.
- [ ] Commit `feat: build overview dashboard`.

### Task 6: Platforms and platform detail
- [ ] `/platforms` grid + compare ranking; `/platforms/[id]` detail with trend chart. Commit `feat: add platforms pages`.

### Task 7: Content library and post sheet
- [ ] Filter chips, list/table, glass bottom sheet (dialog) with focus handling. Commit `feat: add content library with post detail sheet`.

### Task 8: Audience and reports
- [ ] Bars + heatmap; report presets, export buttons, weekly email switch. Commit `feat: add audience and reports pages`.

### Task 9: Settings
- [ ] Connected accounts, alert switches, profile. Commit `feat: add settings page`.

### Task 10: Onboarding and sign in
- [ ] `/sign-in`, `/onboarding/connect`, `/onboarding/sync`. Commit `feat: add sign-in and onboarding flow`.

### Task 11: Landing page
- [ ] `/` with preview and CTA. Commit `feat: add landing page`.

### Task 12: Verify and polish
- [ ] `npm test`, `npm run lint`, `npm run build` clean; screenshot desktop and phone widths; fix issues. Commit `fix: polish from visual review`.
