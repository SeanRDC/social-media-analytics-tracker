# Real-data empty states and profile photo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Show "Connect a platform" instead of sample numbers for signed-in users without imports, and let them change their profile photo from Settings.

**Architecture:** `hasData()`/nullable `getReportData()` in the data API decide empty states; a `user_avatar` table plus `src/lib/avatar.ts` (pure validation + db helpers), a server action pair, a `/api/avatar` route and a client `AvatarEditor`.

**Tech Stack:** Next.js 16, React 19, Drizzle (Postgres/PGlite), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-18-real-data-and-profile-photo-design.md`

## Global Constraints

- Photo ≤ 200,000 bytes, PNG/JPEG/WebP by magic bytes; stored base64 in `user_avatar`; served only to its owner.
- No commits or pushes (owner holds commits until 2026-11-19).
- `npx vitest run --maxWorkers=2`, `npx tsc --noEmit` green before calling a task done.

## Review Focus

- A non-image file renamed `.png` is rejected server-side (magic bytes, not the name).
- Removing a photo leaves no stale image in navbar/banner (cache-busting `?v=`).
- Reports with no data: the CSV route can't be hit directly to download sample numbers.
- Visitor not signed in requesting `/api/avatar` gets no one else's photo.
- `/platforms/x` with no data shows NoData, not 404.

---

### Task 1: Empty states
**Files:** `src/lib/data/api.ts`, `src/components/ui/NoData.tsx` (+css, +test), the five data pages, `AppShell.tsx`, `ExportButton.tsx` (+test), reports page, export route, print page.
- [ ] Test `NoData`: heading "Connect a platform to see your numbers", link "Connect platforms" → `/onboarding/connect`. RED → implement → GREEN.
- [ ] Test `ExportButton disabled`: renders no link, text "Nothing to export yet" available, `aria-disabled="true"`. RED → GREEN.
- [ ] `hasData(): Promise<boolean>`; `getReportData(): Promise<ReportData | null>`; wire pages, routes, shell notice.

### Task 2: Profile photo
**Files:** `src/db/schema.ts` (+ generated migration), `src/lib/avatar.ts` (+test), `src/app/actions/avatar.ts`, `src/app/api/avatar/route.ts`, `src/components/settings/AvatarEditor.tsx` (+css, +test), `Avatar.tsx`, `TopNav.tsx`, `AppShell.tsx`, settings page.
- [ ] Test `sniffImage(bytes)` → "image/png" | "image/jpeg" | "image/webp" | null and `validateAvatar` size/empty errors; db test: `saveAvatar` upserts and sets `user.image` to `/api/avatar?v=…`, `removeAvatar` clears both. RED → GREEN.
- [ ] Test `AvatarEditor`: "Change photo" button opens picker; choosing a file calls `onUpload` with FormData `photo` (resize injected); shows returned error; "Remove photo" only with a photo and calls `onRemove`. RED → GREEN.
- [ ] Route + actions + wiring; `npm run db:generate`.

### Task 3: Dev warning + rename leftover
- [ ] `src/app/(app)/loading.tsx`; confirm warning gone in the dev log; `.env.example` EMAIL_FROM name.
