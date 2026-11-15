# Social Media Analytics Tracker

One dashboard for every social account. People connect YouTube, Facebook, TikTok, LinkedIn, Instagram and X, then see followers, views, engagement, their best posts and when to post, side by side.

This repository holds the **front end**, built on realistic sample data. The backend (platform sign-in, real stats, exports, email) comes next and plugs into the data layer described below.

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
| `/sign-in` | Email, Google or Apple sign-in (simulated) |
| `/onboarding/connect` | Connect each platform, including Instagram's Professional-account requirement |
| `/onboarding/sync` | First import progress |
| `/overview` | Hero stats, views per day (this week vs last), weekly growth, top posts |
| `/platforms`, `/platforms/[id]` | Every platform, a compare ranking, and per-platform detail |
| `/content` | Filterable post library; `?post=<id>` opens a post's detail sheet |
| `/audience` | Age, countries and the best time to post |
| `/reports` | Export presets and the weekly email schedule |
| `/settings` | Connected accounts, alerts and appearance |

## Run it

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit and component tests (Vitest)
npm run lint
npm run build && npm start
```

## How it's organised

```
src/
  app/              routes (App Router); (app) = dashboard shell, (onboard) = sign-in and onboarding
  components/       UI by area: shell, overview, platforms, content, audience, reports, settings, onboarding, ui, charts, motion
  hooks/            sliding indicators, FLIP reordering, element width, reduced motion
  lib/
    data/           types, sample data and api.ts (the data layer)
    chart.ts        chart geometry
    format.ts       number and date formatting
    brand.ts        product name, kept in one place
```

### Wiring the backend

Every page reads data through the async functions in `src/lib/data/api.ts` (`getOverview`, `getPlatforms`, `getPosts`, `getAudience`, and others). Replace their bodies with real requests and the UI keeps working. The types in `src/lib/data/types.ts` are the contract.

Simulated in this prototype: sign-in, connecting accounts, the first import, exports, the weekly email, and disconnecting accounts (local state only).

## Tech

Next.js 16 (App Router, Cache Components), React 19, TypeScript, CSS Modules, hand-built SVG charts, Vitest and Testing Library.
