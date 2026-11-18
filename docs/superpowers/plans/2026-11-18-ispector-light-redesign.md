# Ispector light redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Graphite liquid-glass look with a light, Ramos-inspired design and a floating dark top navbar, and rename the app to Ispector.

**Architecture:** Styling-only change on top of existing components. New tokens in `src/app/globals.css`; glass utilities deleted; the side `Rail` is replaced by a `TopNav` client component; each CSS module is rewritten against the new tokens. No data, routing or server code changes.

**Tech Stack:** Next.js 16 (App Router), React 19, CSS modules, `next/font/google` (Urbanist + Geist), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-18-ispector-light-redesign-design.md`

## Global Constraints

- Tokens exactly as the spec: bg `#F3F2EE`, card `#FFFFFF` r24, ink `#141416`, muted `#6E6E76`, cobalt `#3B5BFF`, lime `#D7F25A`, lilac `#B7A8FF`, mint `#7FD8AE`, up `#1E9E63`, down `#E5484D`; nav `#141416` / inset `#232327` / hover `#2E2E33` / active `#3A3A40`.
- No `backdrop-filter`, `.glass`, `.rim`, `.sweep`, grain or smoky backdrop anywhere when finished (`grep -r "backdrop-filter\|glass\|rim\b\|sweep" src` is empty, except the word in comments being removed).
- App name "Ispector" via `APP_NAME` only.
- One commit per task, authored by the owner, **no Co-Authored-By trailer**, then `git push origin main`.
- `npm test` and `npx tsc --noEmit` pass before every commit.
- Read `node_modules/next/dist/docs/` for `next/font` before touching fonts (AGENTS.md).

## Review Focus

- Long account names in the white account pill: must truncate with ellipsis, not push the nav wider than the viewport.
- 640–900px widths: five centre links plus right-side buttons must fit without wrapping or horizontal scroll.
- Keyboard: every nav link reachable by Tab with a visible focus ring on the dark bar (outline colour must contrast on `#141416`).
- Charts and platform pills on white: lines/labels that were tuned for dark (e.g. `rgba(255,255,255,…)` grid colours) must be re-pointed to tokens so nothing disappears.
- Print report (`/reports/print/*`): must stay black-on-white and not pick up the navbar.

---

### Task 1: Tokens, base styles, fonts, rename

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/lib/brand.ts`, `README.md`, `src/app/manifest.ts`, `public/icon.svg` (recolour only)

- [ ] Read the `next/font` doc in `node_modules/next/dist/docs/`.
- [ ] `brand.ts`: `APP_NAME = "Ispector"`; README alt/title text.
- [ ] `layout.tsx`: add `Urbanist` as `--font-display`; `themeColor: "#F3F2EE"`, `colorScheme: "light"`, `statusBarStyle: "default"`.
- [ ] `globals.css`: replace `:root` with the spec tokens (keep the existing token *names* so modules keep resolving; add `--display`, `--lime`, `--lilac`, `--mint`, `--nav*`, `--shadow`, `--shadow-hover`); `color-scheme: light`; delete `body::before/::after`, `.glass`, `.rim`, `.sweep`, the glass fallbacks; add `.card` utility (white, r24, border, shadow) and keep `.lift`/`.press`/`.reveal`; repaint `.lens`/`.thumb-*` artwork to the new accents.
- [ ] Replace every `glass`/`rim`/`sweep` className usage in TSX with `card` (or nothing for nav elements restyled in Task 2).
- [ ] Run `npm test` and `npx tsc --noEmit`: PASS. Check `/overview` loads light in the browser.
- [ ] Commit `feat: switch to the light Ispector palette and drop the glass styles`; push.

### Task 2: TopNav and phone tab bar

**Files:**
- Create: `src/components/shell/TopNav.tsx`, `src/components/shell/TopNav.module.css`, `src/components/shell/__tests__/TopNav.test.tsx`
- Modify: `AppShell.tsx`, `AppShell.module.css`, `Header.tsx`, `Header.module.css`, `TabBar.module.css`, `nav.ts` (rename `RAIL_NAV` → `MAIN_NAV`)
- Delete: `Rail.tsx`, `Rail.module.css`

**Interfaces:**
- Produces: `TopNav({ accountName }: { accountName: string })` client component; `MAIN_NAV: NavItem[]` in `nav.ts`.

- [ ] Write `TopNav.test.tsx` (mock `next/navigation` `usePathname` → `/platforms/youtube`): asserts link "Platforms" has `aria-current="page"`, "Overview" has none; the brand link has accessible name "Ispector home"; the account button text contains the account name; links "Alerts" and "Settings" exist.
- [ ] Run it: FAIL (module missing).
- [ ] Implement `TopNav`: `<header>` sticky, `<nav aria-label="Main">` with logo link, inset pill of `MAIN_NAV` links using `useSlidingIndicator` for the active pill plus a second hover indicator driven by `onPointerEnter` on the container items; right side bell (badge) + gear links and a white account pill linking to `/settings` with `Avatar` + name (`text-overflow: ellipsis`, max-width 160px). Hidden below 640px except logo + avatar.
- [ ] `AppShell`: drop the frame/rail grid; render `TopNav` inside `SignedIn` (needs the user's name) with a static skeleton bar fallback so the shell still paints instantly; main column max-width 1320px centred.
- [ ] `Header`: remove mail/search/avatar buttons (moved to nav); title in `var(--display)` 36px/600 (28px phone), range control on the right.
- [ ] `TabBar`: dark pill (`--nav`), active pill `--nav-active`, active icon lime; remove glass classes.
- [ ] Run `npm test`, `tsc`: PASS. Browser: 1280, 800, 390 widths; Tab through nav.
- [ ] Commit `feat: replace the side rail with a floating top navbar`; push.

### Task 3: Overview

**Files:** `src/components/overview/{HeroCard,Cards,TopPostsTable}.module.css`, `src/app/(app)/overview/overview.module.css`, `src/components/charts/LineChart.module.css`, `Sparkline.tsx` (colour props only)

- [ ] Hero becomes a white card with big Urbanist total, overlapping round icon badges, and a KPI strip of coloured tiles (cobalt text-white, lime, lilac, mint). Growth/daily-views cards white; chart lines cobalt (this week) and ink-30% (last week); grid `--grid`. Table rows: hairline dividers, hover `--rowh`.
- [ ] `npm test`: PASS. Browser check desktop + phone.
- [ ] Commit `feat: restyle the overview for the light design`; push.

### Task 4: Platforms

**Files:** `src/components/platforms/{Platforms,PlatformDetail}.module.css`, `src/components/ui/{PlatformPill,ArrowButton,SortMenu,ExportButton,Switch}.module.css`, `src/components/shell/SegmentedControl.module.css`

- [ ] Cards white with a platform-colour round badge; ranking bars use platform colours; ArrowButton: primary = ink pill with white text and lime arrow circle, secondary (`tone="glass"` kept as prop name, restyled) = white with border; segmented control = `#E9E8E3` track, white thumb.
- [ ] Verify platform colours ≥3:1 on white; darken any that fail in `globals.css`.
- [ ] Test, browser check, commit `feat: restyle platforms and shared controls`; push.

### Task 5: Content and Audience

**Files:** `src/components/content/{ContentLibrary,PostSheet}.module.css`, `src/components/audience/Audience.module.css`

- [ ] Post sheet: white sheet, `rgba(20,20,22,.35)` scrim (no blur). Best-times heatmap ramps from `#EEF1FF` to cobalt. Share bars in platform colours on `#ECEBE6` track.
- [ ] Test, browser check, commit `feat: restyle content and audience`; push.

### Task 6: Reports and Settings

**Files:** `src/components/reports/{Reports,Print}.module.css`, `src/components/settings/Settings.module.css`

- [ ] Report preset cards as coloured tiles (lime, lilac, mint); print stylesheet stays plain black-on-white; settings sections as white cards, danger zone with `--down` border.
- [ ] Test, browser check (incl. a print route), commit `feat: restyle reports and settings`; push.

### Task 7: Landing, onboarding, legal, 404

**Files:** `src/app/page.tsx`, `src/components/landing/Landing.module.css`, `src/components/onboarding/Onboarding.module.css`, `src/components/legal/Legal.module.css`, `src/app/not-found.tsx`

- [ ] Landing nav uses the same dark bar look (Live demo · Sign in inside the inset pill, white "Start free"); hero headline with inline round icon badges (cobalt, lime, lilac) and a faint 64px grid background; features as white cards. Sign-in/onboarding/legal on the off-white page with white cards.
- [ ] Final grep for leftover glass (Global Constraints) is empty.
- [ ] Test, browser check, commit `feat: restyle the landing, sign-in, onboarding and legal pages`; push.
