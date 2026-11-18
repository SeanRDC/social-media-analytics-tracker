# Ispector light redesign: design

Date: 2026-11-18 · Status: approved by the owner

## Intent

The owner wants to drop the Graphite liquid-glass look and redesign the whole app, taking heavy inspiration from the Ramos Webflow template (https://ramos-app.webflow.io/), which is also an analytics product. They like its navbar most of all. The result must not be a 1:1 copy: own palette, own name. The app is renamed **Ispector** (spelled as the owner wrote it).

## Goals

- A Ramos-style navbar: floating near-black rounded bar, links grouped in a darker inset pill, hover pill, white action button on the right.
- A light, airy, friendly look: warm off-white page, white rounded cards, soft shadows, bright accent tiles, big headline type.
- Every screen restyled: app shell, Overview, Platforms (+ detail), Content (+ post sheet), Audience, Reports (+ print), Settings, landing, sign-in, onboarding, legal, 404.
- Rename to Ispector everywhere the name is shown.

## Non-goals

- No behaviour, data, routing or backend changes. Components keep their props and logic; tests keep passing.
- No dark mode or theme toggle.
- No new CSS framework (the project uses CSS modules).

## Anti-goals

- Copying Ramos's orange/yellow palette, logo, wording or exact layouts.
- Any leftover glass: no `backdrop-filter`, rim highlights, grain or smoky backdrop.

## Approaches considered

1. **Restyle in place (chosen):** swap design tokens in `globals.css`, remove the glass utilities, rewrite the CSS modules, and replace the side rail with a top navbar component. Keeps all logic and tests.
2. **Adopt Tailwind and rebuild components:** rejected. It rewrites everything for no visual gain and fights the existing CSS-module setup.
3. **Light + dark themes with a toggle:** rejected for now. It doubles the design work and the owner chose light.

## Design

### Tokens

- Page `--bg #F3F2EE` (warm off-white). Cards `#FFFFFF`, radius 24px (inner tiles 16px), shadow `0 1px 2px rgba(20,20,22,.04), 0 12px 32px -16px rgba(20,20,22,.14)`, border `rgba(20,20,22,.06)`.
- Ink `--tx #141416`, muted `--mu #6E6E76`, hairlines `rgba(20,20,22,.08)`.
- Accents: cobalt `#3B5BFF` (primary: charts, links, primary buttons), lime `#D7F25A` (highlights, active dot), lilac `#B7A8FF` and mint `#7FD8AE` (stat tiles). Up `#1E9E63`, down `#E5484D`, warning amber.
- Nav ink `#141416`, inset pill `#232327`, hover pill `#2E2E33`, active pill `#3A3A40`.
- Platform colours keep their order; only darken any that fail contrast on white.
- Type: Urbanist (Google, via `next/font`) for headings, nav, and big numbers; Geist for body and tables (tabular figures).

### Navbar (desktop and tablet, ≥640px)

Sticky at top with a 12px gap around it: a near-black bar with 18px corners, about 62px tall. Left: round lime logo badge + "Ispector". Centre: an inset pill holding Overview · Platforms · Content · Audience · Reports as text links. A sliding pill follows the hover, and the current page gets a lighter pill with a small lime dot. Right: alerts (bell with badge) and settings icon buttons, then a white account pill (avatar + account name). The page title (big Urbanist) and the 7D/30D/90D control move into a header row below the bar. Below about 900px the centre links drop their spacing to fit.

### Phone (<640px)

The top bar shrinks to logo + avatar. The bottom tab bar becomes a dark floating pill matching the navbar, and the active tab gets a lighter pill with a lime icon.

### Landing

The same navbar with "Live demo · Sign in" and a white "Start free" button. Big headline with overlapping round icon badges (cobalt, lime, lilac), and a faint grid behind the hero.

### Motion

Keep the existing reveal, count-up, draw and grow animations and reduced-motion handling. The glass light-sweep is removed; hover is a lift plus a shadow deepen.

## Delivery

One commit per step, each pushed to origin/main under the owner's name with no Claude co-author line: tokens/base → navbar + tab bar → Overview → Platforms → Content + Audience → Reports + Settings → landing, onboarding, legal, 404. Each step is checked in the browser at desktop and phone widths, with `npm test` passing before the push.

## Left to the builder

Exact spacing, chart colour assignments within the palette, and per-component layout details, following the tokens above.
