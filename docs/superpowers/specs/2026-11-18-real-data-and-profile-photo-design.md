# Real-data empty states and profile photo: design

Date: 2026-11-18 · Status: approved by the owner · Size: small change

## Intent

The owner is about to connect real platforms and doesn't want demo numbers in their own account. They also want to change their profile picture by hovering their avatar on the profile (Settings) page. Constraint from the owner: stay on free services; Postgres stays for now (a MongoDB move was floated for later, so keep the photo storage isolated).

## Approaches

- Empty state: **(chosen)** each data page shows a single "Connect a platform" card when nothing is imported; the alternative, keeping the sample dataset until the first import, is what the owner rejected.
- Photo storage: **(chosen)** resize to 256×256 in the browser and store in a separate `user_avatar` table in Postgres (base64 text, ≤200 KB), served from `/api/avatar` to the signed-in user only. Rejected: Vercel Blob (extra service, owner wants nothing paid or new).

## Design

1. `hasData()` in `src/lib/data/api.ts`; overview, platforms, platform detail, content and audience render `<NoData />` without imported data. The shell's notice keeps only the "simulated" message. `getReportData()` returns `null` without data; Reports disables PDF/CSV ("Nothing to export yet"); the export route answers 404 and the print page a short message. The landing page preview keeps its sample data. Simulated local connections keep generating labelled numbers.
2. `AvatarEditor` in the Settings profile banner: hover/focus/tap reveals a dark overlay with a camera icon and "Change photo"; file picker (image/*); browser crop+resize to a 256 px square (WebP, JPEG fallback); server action validates magic bytes (PNG/JPEG/WebP) and size, upserts `user_avatar`, sets `user.image` to `/api/avatar?v=<timestamp>`; "Remove photo" deletes it. `Avatar` renders `src` when present, else the placeholder art; the navbar account pill uses it too.
3. Add `src/app/(app)/loading.tsx` so page navigations have their own boundary (Next.js instant-navigation check); fall back to `export const instant = false` on the layout if that doesn't clear it.
4. Fix leftover "Social Tracker" in `.env.example`.

No commits until the owner says so.
