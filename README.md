# Social Media Analytics Tracker

One dashboard for every social account. People connect YouTube, Facebook, TikTok, LinkedIn and Instagram, then see followers, views, engagement, their best posts and when to post, side by side.

The front end is complete. The backend is being built in phases (see [the backend design](docs/superpowers/specs/2026-11-15-backend-design.md)):

- **Done:** phase 0 (verified platform API notes, owner setup checklist, privacy/terms/data-deletion pages) and phase 1 (Postgres schema and migrations, real sign-in, protected routes).
- **Next:** phase 2 (connecting platforms), then YouTube, Meta, TikTok and LinkedIn data, exports and alerts.

Until platforms are connected, the dashboard shows clearly labelled sample data.

## Design

"Graphite": dark, smoky frosted glass with ice-blue accents, based on the owner's inspiration image. The design spec and build plan are in [`docs/superpowers`](docs/superpowers).

- Frosted glass panels with a lit edge, film grain and layered soft shadows
- Motion everywhere it helps: panels rise in, numbers count up, chart lines draw themselves, a dot pulses on today, highlights spring between tabs, rows glide when re-sorted, and a band of light sweeps across glass on hover
- Responsive from phones to wide desktops: a floating tab bar on phones, a slim icon rail from 640px up
- Phone friendly: safe areas for notches and home indicators, 44px+ tap targets, 16px form inputs (no iOS zoom), bottom sheets, installable from the browser
- Respects device settings: Reduce Motion stops the animation and Reduce Transparency makes the glass solid

## Screens

| Route | What it shows |
|---|---|
| `/` | Landing page with a live preview |
| `/sign-in` | Email magic link; Google and Apple when configured |
| `/onboarding/connect` | Connect each platform, including Instagram's Professional-account requirement (simulated until phase 2) |
| `/onboarding/sync` | First import progress (simulated until phase 2) |
| `/overview` | Hero stats, views per day (this week vs last), weekly growth, top posts |
| `/platforms`, `/platforms/[id]` | Every platform, a compare ranking, and per-platform detail |
| `/content` | Filterable post library; `?post=<id>` opens a post's detail sheet |
| `/audience` | Age, countries and the best time to post |
| `/reports` | Export presets and the weekly email schedule |
| `/settings` | Profile and sign out, connected accounts, alerts, appearance |
| `/privacy`, `/terms`, `/data-deletion` | Legal pages required by platform reviews (drafts) |

Dashboard pages require sign-in.

## Run it

Requires Node.js 20 or newer. No accounts or external services are needed to run it locally.

```bash
npm install
cp .env.example .env.local   # then set BETTER_AUTH_SECRET (npx @better-auth/cli secret)
npm run dev                  # applies database migrations, then http://localhost:3000
npm test                     # unit and component tests (Vitest)
npm run lint
npm run build && npm start
npm run db:generate          # after changing src/db/schema.ts
npm run db:migrate           # apply migrations (local PGlite, or Neon when DATABASE_URL is set)
```

**Signing in locally:** enter any email on `/sign-in`. Without an email service the link is printed in the terminal, and the "check your email" screen shows a **Development: open the sign-in link** button.

**Local database:** with `DATABASE_URL` unset, an embedded Postgres (PGlite) lives in `.data/pglite` (git-ignored). Stop the dev server and delete that folder to start fresh.

## How it's organised

```
src/
  app/              routes (App Router); (app) = dashboard, (onboard) = sign-in and onboarding, (legal) = policies, api/ = auth
  components/       UI by area: shell, overview, platforms, content, audience, reports, settings, onboarding, legal, ui, charts, motion
  db/               Drizzle schema and database client
  hooks/            sliding indicators, FLIP reordering, element width, reduced motion
  lib/
    data/           types, sample data and api.ts (the data layer)
    auth.ts, dal.ts sign-in config and the session check
    chart.ts        chart geometry
    format.ts       number and date formatting
    brand.ts        product name and legal contact, kept in one place
  proxy.ts          sends signed-out visitors to /sign-in
drizzle/            generated SQL migrations
docs/               design specs, plans, platform API notes, owner setup checklist
```

## Backend

| Piece | Where |
|---|---|
| Schema and migrations | `src/db/schema.ts`, `drizzle/` |
| Database client (Neon or local PGlite) | `src/db/index.ts` |
| Sign-in (Better Auth: magic link, Google, Apple) | `src/lib/auth.ts`, `/api/auth/*` |
| Route protection | `src/proxy.ts` (fast cookie check) and `src/lib/dal.ts` (`requireUser`, the real check) |
| Sign-in emails | `src/lib/email.ts` (Resend when `RESEND_API_KEY` is set) |
| Environment variables | `.env.example` |
| Owner setup (Neon, Vercel, Google, Meta, TikTok, LinkedIn) | `docs/platforms/setup-checklist.md` |
| What each platform API provides | `docs/platforms/api-notes.md` |

### Deploying (Vercel + Neon)

1. Create a Neon project and copy its **pooled** connection string.
2. Import the GitHub repo into Vercel. Add the variables from `.env.example`: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (the Vercel URL), `RESEND_API_KEY`, `EMAIL_FROM`, `LEGAL_CONTACT_EMAIL`.
3. Set the Build Command to `npm run db:migrate && npm run build` so each deploy applies new migrations.
4. Deploy, then sign in with your email.

### Wiring the data layer

Every page reads data through the async functions in `src/lib/data/api.ts` (`getOverview`, `getDailyViews`, `getPlatforms`, `getPosts`, `getAudience`, and others). Later phases replace their bodies with database queries and the UI keeps working. The types in `src/lib/data/types.ts` are the contract.

Still simulated until later phases: connecting accounts, the first import, exports, the weekly email, and disconnecting accounts (local state only). Sign-in and sessions are real.

## Tech

Next.js 16 (App Router, Cache Components), React 19, TypeScript, CSS Modules, hand-built SVG charts, Drizzle ORM with Postgres (Neon in production, PGlite locally), Better Auth, Vitest and Testing Library.
