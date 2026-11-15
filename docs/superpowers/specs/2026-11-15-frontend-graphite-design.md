# Front End Design: "Graphite" (pitch J)

Date: 2026-11-15 · Status: chosen by product owner (round 4 pitch J)

## Intent

A social media analytics tracker. People connect Facebook, YouTube, Instagram, TikTok, LinkedIn and X, then see followers, views, engagement and their best content in one place. This phase builds the **front end only**, on realistic sample data, behind a data layer that the backend replaces later.

The look follows the owner's inspiration image (a dark, smoky-glass "Channel Analytics" dashboard) recoloured to graphite and ice blue, with motion on every interaction.

## Goals

- Pixel-faithful build of pitch J (round 4) on desktop, adapted for tablet and phone.
- Responsive and iOS/Android friendly: safe areas, 44pt/48dp tap targets, inputs ≥ 16px, installable (web manifest).
- Motion kit: staggered entrance, count-up numbers, line draw-on, live pulse, sliding nav highlight, hover light sweep, FLIP table sort, press feedback. All of it is off under `prefers-reduced-motion`.
- Glass done right: blur + saturate, lit rim, grain, layered shadow; solid fallback under `prefers-reduced-transparency` and without `backdrop-filter`.
- A typed data layer (`src/lib/data`) with async functions so the backend can be wired without touching UI.

## Non-goals (this phase)

- Real OAuth, real platform APIs, persistence, auth sessions, billing.
- Light theme (pitch L was not chosen; tokens leave room for it).
- Native store apps (Capacitor wrap can come later).

## Anti-goals

- Glass that hurts legibility: text on glass must meet 4.5:1.
- Janky motion: only `transform`/`opacity` animate; no more than ~5 blurred layers on screen.
- Hover-only features: every hover has a tap/focus equivalent.

## Approaches considered

1. **Next.js (App Router) + TypeScript + CSS Modules + hand-built SVG charts** (chosen). Matches the mock CSS almost line for line, no chart library fighting the glow/peak-label styling, API routes available for the backend phase.
2. Next.js + Tailwind + Recharts. Faster for generic charts, but the design's custom chart details (glow line, peak pill, now-pulse, two-series tooltip) mean heavy overrides.
3. Vite SPA. Lighter, but the backend phase would need a separate server for OAuth callbacks.

## Visual system

- Fonts: Geist (UI). Numbers use tabular figures.
- Tokens (graphite world): text `#f2f4f7`, muted `#9ba3af`, accent ice `#8fd0ff`, secondary line `rgba(255,255,255,.72)`, live `#7ff0b8`, window `rgba(38,41,47,.55)`, rail `rgba(10,11,14,.85)`, card `rgba(255,255,255,.055)`, card border `rgba(255,255,255,.09)`, tooltip `#f2f4f7` on `#14161a`.
- Platform colours (fixed order, colour-blind validated): YouTube `#e66767`, Facebook `#3987e5`, TikTok `#199e70`, LinkedIn `#9085e9`, Instagram `#d55181`, X `#c98500`. Always shown with the platform name.
- Easing: out `cubic-bezier(.16,1,.3,1)`, spring `cubic-bezier(.34,1.56,.64,1)`, in `cubic-bezier(.4,0,1,1)`. Clicks respond within 100–250 ms.

## Layout

- **≥ 1024px:** glass window inset 16px; 60px dark rail (logo, 5 nav items with sliding highlight and hover labels, alerts, settings); header (page title, 7D/30D/90D, messages, search, avatar); page content.
- **640–1023px:** same rail; content grids collapse to two columns.
- **< 640px:** no window frame or rail; floating glass tab bar at the bottom (Overview, Platforms, Content, Reports, Profile) clear of the home indicator; single column.

## Screens

| Route | Content |
|---|---|
| `/` | Landing: headline, dashboard preview, platform row, "Start free" |
| `/sign-in` | Email + Google/Apple buttons (non-functional) |
| `/onboarding/connect` | Platform list, connected/needs-professional/connect states, progress |
| `/onboarding/sync` | Per-platform import progress, then continue |
| `/overview` | Hero + KPI strip, live viewers chart, growth card + top platform, top posts table with sort |
| `/platforms` | Platform cards (followers, growth, engagement) and a compare ranking |
| `/platforms/[id]` | One platform: big number, follower trend, stats, recent posts |
| `/content` | Filterable post library; post detail opens as a glass sheet |
| `/audience` | Age and country bars, best-time-to-post heatmap |
| `/reports` | Report presets, export (PDF/CSV, non-functional), weekly email toggle |
| `/settings` | Connected accounts, alerts toggles, profile |

## Data layer contract

`src/lib/data/api.ts` exports async functions (`getOverview`, `getLiveViewers`, `getTopPosts`, `getPlatforms`, `getPlatform`, `getPosts`, `getAudience`, `getConnections`). Today they read `sample.ts`; the backend phase swaps the bodies. Sample numbers are internally consistent (total audience 248.6K = YouTube 112.4K + Instagram 58.2K + TikTok 46.9K + Facebook 21.7K + LinkedIn 9.4K).

## Left to the builder

Component boundaries, file names inside the structure in the plan, exact breakpoints for small polish.
