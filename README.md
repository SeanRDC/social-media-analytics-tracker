<div align="center">

<img src="public/icon.svg" alt="Social Tracker logo" width="88" height="88" />

# Social Media Analytics Tracker

**One dashboard for every social account.**
Connect YouTube, Facebook, TikTok, LinkedIn and Instagram, then see followers, views, engagement, your best posts and when to post, side by side.

<br />

![Status: under development](https://img.shields.io/badge/status-under%20development-f59e0b?style=for-the-badge)
![Version](https://img.shields.io/badge/version-0.1.0-7dd3fc?style=for-the-badge)
![Last commit](https://img.shields.io/github/last-commit/SeanRDC/social-media-analytics-tracker?style=for-the-badge&color=1f2937)

<br />

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![CSS Modules](https://img.shields.io/badge/CSS_Modules-000000?style=flat-square&logo=cssmodules&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Neon](https://img.shields.io/badge/Neon-00E599?style=flat-square&logo=neon&logoColor=black)
![PGlite](https://img.shields.io/badge/PGlite-336791?style=flat-square&logo=postgresql&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat-square&logo=drizzle&logoColor=black)
![Better Auth](https://img.shields.io/badge/Better_Auth-111111?style=flat-square&logo=auth0&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)
![Testing Library](https://img.shields.io/badge/Testing_Library-E33332?style=flat-square&logo=testinglibrary&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=flat-square&logo=eslint&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

<br />

[Features](#-features) · [Design](#-design) · [Screens](#-screens) · [Getting started](#-getting-started) · [Project structure](#-project-structure) · [Backend](#-backend) · [Roadmap](#-roadmap)

</div>

---

> [!WARNING]
> **This project is under active development.** The front end is complete, and the backend is being built in phases. Sign-in, platform connections, imports for all five platforms, exports, the weekly email and alerts are built. Until a platform has been imported the dashboard shows clearly labelled **sample data**, and real platform numbers need each platform's app approval (see the setup checklist). Expect breaking changes.

## ✨ Features

- 📊 **Unified overview:** hero stats, views per day (this week vs last), weekly growth and top posts across every platform
- 🔗 **Five platforms:** YouTube, Facebook, TikTok, LinkedIn and Instagram, with a compare ranking and per-platform detail
- 🗂️ **Content library:** filter every post and open a detail sheet for any one of them
- 👥 **Audience insights:** age, countries and the best time to post
- 📨 **Reports:** CSV and print-ready PDF exports, and a weekly email on the day you choose
- 🔔 **Alerts:** posts taking off, follower milestones, engagement drops and accounts needing reconnection, by email and web push
- 🔐 **Real sign-in:** email magic links, plus Google and Apple when configured, with protected routes
- 📱 **Installable and phone friendly:** works from phones to wide desktops

## 🎨 Design

**"Graphite":** dark, smoky frosted glass with ice-blue accents. The design spec and build plan are in [`docs/superpowers`](docs/superpowers).

| | |
|---|---|
| 🧊 **Glass** | Frosted panels with a lit edge, film grain and layered soft shadows |
| 🎬 **Motion** | Panels rise in, numbers count up, chart lines draw themselves, a dot pulses on today, highlights spring between tabs, rows glide when re-sorted, and a band of light sweeps across glass on hover |
| 📐 **Responsive** | A floating tab bar on phones and a slim icon rail from 640px up |
| 👆 **Touch** | Safe areas for notches and home indicators, 44px+ tap targets, 16px inputs (no iOS zoom), bottom sheets |
| ♿ **Accessible** | Reduce Motion stops the animation and Reduce Transparency makes the glass solid |

## 🖥️ Screens

| Route | What it shows |
|---|---|
| `/` | Landing page with a live preview |
| `/sign-in` | Email magic link; Google and Apple when configured |
| `/onboarding/connect` | Connect each platform through its own approval screen, including Instagram's Professional-account requirement |
| `/onboarding/sync` | First import of each connected platform's history |
| `/overview` | Hero stats, views per day, weekly growth, top posts |
| `/platforms`, `/platforms/[id]` | Every platform, a compare ranking, and per-platform detail |
| `/content` | Filterable post library; `?post=<id>` opens a post's detail sheet |
| `/audience` | Age, countries and the best time to post |
| `/reports` | Export presets (CSV download, PDF via a print-ready page) and the weekly email schedule |
| `/reports/print/[preset]` | Print-ready report; the print dialog saves it as a PDF |
| `/settings` | Profile and sign out, connected accounts (connect, reconnect, disconnect), alerts and push notifications, appearance |
| `/privacy`, `/terms`, `/data-deletion` | Legal pages required by platform reviews *(drafts)* |

Dashboard pages require sign-in.

## 🚀 Getting started

**Requirements:** Node.js 20 or newer. No accounts or external services are needed to run it locally.

```bash
git clone https://github.com/SeanRDC/social-media-analytics-tracker.git
cd social-media-analytics-tracker
npm install
cp .env.example .env.local   # then set BETTER_AUTH_SECRET (npx @better-auth/cli secret)
npm run dev                  # applies database migrations, then http://localhost:3000
```

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Applies migrations, then starts the dev server |
| `npm test` | Unit and component tests (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run lint` | ESLint |
| `npm run build && npm start` | Production build and server |
| `npm run db:generate` | Generate a migration after changing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations (local PGlite, or Neon when `DATABASE_URL` is set) |
| `npm run db:studio` | Open Drizzle Studio |

> [!TIP]
> **Signing in locally:** enter any email on `/sign-in`. Without an email service, the link is printed in the terminal, and the "check your email" screen shows a **Development: open the sign-in link** button.

> [!TIP]
> **Connecting platforms locally:** platforms without credentials in `.env.local` are **simulated**: Connect runs the full flow (state check, encrypted tokens, storage) against a stand-in and labels the account "Simulated locally". Add a platform's credentials to connect it for real, or set `CONNECT_SIMULATION=off` to hide unconfigured platforms.

> [!NOTE]
> **Local database:** with `DATABASE_URL` unset, an embedded Postgres (PGlite) lives in `.data/pglite` (git-ignored). Stop the dev server and delete that folder to start fresh.

## 📁 Project structure

```
src/
  app/              routes (App Router); (app) = dashboard, (onboard) = sign-in and onboarding,
                    (legal) = policies, api/ = auth
  components/       UI by area: shell, overview, platforms, content, audience, reports,
                    settings, onboarding, legal, ui, charts, motion
  db/               Drizzle schema and database client
  hooks/            sliding indicators, FLIP reordering, element width, reduced motion
  lib/
    connect/        platform OAuth: providers, token encryption, connect flow, connection service
    data/           types, api.ts (the data layer), compute.ts (rows → dashboard), live.ts, sample data
    sync/           platform fetchers (YouTube, Facebook, Instagram, TikTok, LinkedIn), generated history, sync service
    reports/        report builder (CSV, print view, email) and the weekly email schedule
    alerts/         alert rules and delivery
    push.ts         web push (VAPID)
    auth.ts, dal.ts sign-in config and the session check
    chart.ts        chart geometry
    format.ts       number and date formatting
    brand.ts        product name and legal contact, kept in one place
  proxy.ts          sends signed-out visitors to /sign-in
drizzle/            generated SQL migrations
docs/               design specs, plans, platform API notes, owner setup checklist
```

## 🛠️ Backend

| Piece | Where |
|---|---|
| Schema and migrations | `src/db/schema.ts`, `drizzle/` |
| Database client (Neon or local PGlite) | `src/db/index.ts` |
| Sign-in (Better Auth: magic link, Google, Apple) | `src/lib/auth.ts`, `/api/auth/*` |
| Route protection | `src/proxy.ts` (fast cookie check) and `src/lib/dal.ts` (`requireUser`, the real check) |
| Sign-in emails | `src/lib/email.ts` (Resend when `RESEND_API_KEY` is set) |
| Platform connections | `/api/connect/[platform]/start` and `/callback`; providers in `src/lib/connect/providers/` |
| Token encryption (AES-256-GCM) | `src/lib/connect/crypto.ts`, key from `TOKEN_ENCRYPTION_KEY` |
| Token refresh, disconnect | `src/lib/connect/service.ts` |
| Imports (first import and daily sync) | `src/lib/sync/`; daily job `/api/cron/daily` (`vercel.json`) refreshes tokens, then syncs every account |
| Dashboard numbers | `src/lib/data/live.ts` loads a user's rows, `src/lib/data/compute.ts` turns them into the UI's types |
| Exports | `/api/export/[preset]` (CSV) and `/reports/print/[preset]` (PDF via print), both from `src/lib/reports/build.ts` |
| Weekly email and alerts | `src/lib/reports/schedule.ts`, `src/lib/alerts/`; sent by the daily job after the sync |
| Push notifications | `src/lib/push.ts`, `public/sw.js`; needs `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` |
| Environment variables | `.env.example` |
| Owner setup (Neon, Vercel, Google, Meta, TikTok, LinkedIn) | [`docs/platforms/setup-checklist.md`](docs/platforms/setup-checklist.md) |
| What each platform API provides | [`docs/platforms/api-notes.md`](docs/platforms/api-notes.md) |

### Wiring the data layer

Every dashboard page reads data through the async functions in `src/lib/data/api.ts` (`getOverview`, `getDailyViews`, `getPlatforms`, `getPosts`, `getAudience`, and others). They answer from the signed-in user's imported numbers, or from sample data until something has been imported. The landing page preview uses `sample-api.ts`. The types in `src/lib/data/types.ts` are the contract. Adding a platform means writing its fetcher in `src/lib/sync/` and registering it in `src/lib/sync/service.ts`.

### Deploying (Vercel + Neon)

1. Create a Neon project and copy its **pooled** connection string.
2. Import the GitHub repo into Vercel and add the variables from `.env.example`: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (the Vercel URL), `TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `LEGAL_CONTACT_EMAIL`, plus the credentials of each platform you have set up.
3. Set the Build Command to `npm run db:migrate && npm run build` so each deploy applies new migrations.
4. Deploy, then sign in with your email.

## 🗺️ Roadmap

The full plan is in [the backend design](docs/superpowers/specs/2026-11-15-backend-design.md).

- [x] **Front end:** every screen, the Graphite design system, motion and responsive layouts
- [x] **Phase 0:** verified platform API notes, owner setup checklist, privacy/terms/data-deletion pages
- [x] **Phase 1:** Postgres schema and migrations, real sign-in, protected routes
- [x] **Phase 2:** connecting platforms (OAuth, encrypted tokens, refresh, statuses)
- [x] **Phase 3:** YouTube end to end (180-day history, daily sync, every page on real data)
- [x] **Phase 4:** Facebook Pages and Instagram
- [x] **Phase 5:** TikTok and LinkedIn Pages
- [x] **Phase 6:** CSV and PDF exports, the weekly email, alerts by email and web push
- [ ] **Phase 7:** hardening (rate limits and quotas, retries, monitoring, scaling the nightly job, legal review)

Still to come: phase 7, and checking each platform's fetcher against a real approved account (field names are noted in `docs/platforms/api-notes.md`).

## 🧰 Tech stack

| Layer | Tools |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components), React 19 |
| Language | TypeScript |
| Styling | CSS Modules, hand-built SVG charts |
| Database | PostgreSQL via Drizzle ORM (Neon in production, PGlite locally) |
| Auth | Better Auth (magic link, Google, Apple) |
| Email | Resend |
| Testing | Vitest, Testing Library, jsdom |
| Hosting | Vercel |

---

<div align="center">
<sub>🚧 Under development. Built by <a href="https://github.com/SeanRDC">SeanRDC</a>.</sub>
</div>
