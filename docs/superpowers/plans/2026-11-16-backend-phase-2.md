# Backend Phase 2 Implementation Plan: Connection Framework

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** People can connect and disconnect YouTube, Facebook, Instagram, TikTok and LinkedIn for real: platform OAuth, tokens encrypted at rest, automatic refresh, and real statuses in onboarding and Settings. Stats stay sample data until phase 3.

**Architecture:** One `Provider` object per platform (authorize URL, code exchange, account lookup, refresh, revoke) behind a registry. Two route handlers per platform (`/api/connect/[platform]/start`, `/callback`) carry state and the PKCE verifier in a short-lived encrypted cookie. A `server-only` service owns the `connection` table: save (encrypting tokens with AES-256-GCM), list, get a fresh access token (refreshing or marking `expired`), disconnect (best-effort revoke, then delete with its stats). A daily cron route refreshes long-lived tokens before they lapse. Without platform credentials outside production, a simulated provider runs the same flow so the app still works with zero accounts.

**Tech Stack:** Next.js 16 route handlers and Server Actions, `node:crypto`, Drizzle, Vitest with PGlite and stubbed `fetch`.

**Spec:** `docs/superpowers/specs/2026-11-15-backend-design.md` (phase 2 row), `docs/platforms/api-notes.md`.

## Global Constraints

- Commits: one per feature, repo git identity, no co-author trailers.
- Platform tokens are never stored or logged in plain text; key from `TOKEN_ENCRYPTION_KEY` (32 bytes, base64). Production without the key fails loudly.
- App still runs locally with zero external accounts (simulated connections, clearly labelled).
- Every Server Action and route handler checks the session itself; the cron route checks `CRON_SECRET`.
- Read-only scopes only; X stays out of scope ("Coming later").
- No schema change needed: the phase 1 `connection` table already has encrypted token columns, `scopes`, `token_expires_at` and a unique (user, platform).

## Review Focus

- A tampered, expired or other-user state cookie must not create a connection (callback → `reason=state`).
- `returnTo` must only allow same-site paths (`/settings`, `/onboarding/connect`); `//evil.com` and absolute URLs fall back to `/onboarding/connect`.
- Cancelling on the platform (`error=access_denied`) shows a calm "you cancelled" message, not a crash.
- A refresh that the platform rejects marks the connection `expired` (Settings shows Reconnect) instead of throwing at the user.
- Reconnecting a platform replaces the old tokens in place (unique user + platform), keeping its history.

---

### Task 1: Token encryption — `src/lib/connect/crypto.ts`
- `encrypt(plain: string): string`, `decrypt(sealed: string): string` (format `v1.<iv>.<tag>.<data>`, base64url, random 12-byte IV).
- `seal(value: unknown, ttlSeconds: number): string`, `unseal<T>(sealed: string): T | null` (null when tampered or expired).
- Key: `TOKEN_ENCRYPTION_KEY`; outside production fall back to a key derived from `BETTER_AUTH_SECRET`; in production throw.
- Tests: round trip; two encryptions differ; tampering throws; `unseal` returns null after expiry; production without key throws.

### Task 2: Providers — `src/lib/connect/providers/*`
- `types.ts`: `TokenSet`, `AccountResult`, `Provider`, `ReauthRequired`, `ProviderError`; `oauth.ts`: `postForm`, `getJson`, `pkcePair`.
- `youtube.ts` (Google, PKCE, `access_type=offline`, `prompt=consent`), `facebook.ts` (Graph `v26.0`, long-lived user token → first managed Page token), `instagram.ts` (Instagram Login, short → long-lived token, `ig_refresh_token`, non-professional → `needs-professional`), `tiktok.ts` (`client_key`, comma scopes, 24 h tokens), `linkedin.ts` (`LinkedIn-Version` header, first approved admin organization), `simulated.ts`.
- `index.ts`: `resolveProvider(platform): { provider: Provider; mode: "live" | "simulated" } | null`; `connectMode(platform): "live" | "simulated" | "unavailable"`.
- Tests (stubbed `fetch`): authorize URL params per platform; YouTube exchange; Instagram long-lived exchange and personal account → `needs-professional`; refresh rejection → `ReauthRequired`; `resolveProvider` picks live, simulated or none.

### Task 3: Connection service — `src/lib/connect/service.ts`
- `saveConnection(db, userId, platform, tokens, account)`, `listConnections(db, userId): ConnectionView[]`, `getAccessToken(db, connectionId)`, `disconnect(db, userId, platform)`, `refreshExpiring(db, now)`.
- Tests (PGlite): tokens stored encrypted; reconnect upserts; list covers every platform in order with status and mode; near-expiry token refreshes and is stored; rejected refresh marks `expired`; disconnect deletes the row and its stats.

### Task 4: Connect routes and cron — `src/lib/connect/flow.ts`, `src/app/api/connect/[platform]/{start,callback}/route.ts`, `src/app/api/cron/refresh-tokens/route.ts`, `vercel.json`
- `beginConnect(...)` → `{ location, cookie }`; `completeConnect(...)` → `{ location }` with `?connect=ok|error&platform=…&reason=…`; `safeReturnTo(path)`.
- Tests: full simulated round trip saves a connection; bad state, other user, `access_denied`, unknown platform; `safeReturnTo` cases.

### Task 5: Real statuses in the UI
- `getMyConnections()` (server-only DAL), `disconnectPlatform` Server Action (`refresh()` after).
- `ConnectFlow`: Connect is a link to the start route; shows result messages, the Instagram help panel on `needs-professional`, "Simulated" label, X "Coming later".
- `Connections` (Settings): real Connect/Reconnect links, disconnect through the action, result notice.
- Tests updated first. Commit `feat: connect platforms with OAuth, encrypted tokens and refresh`.

### Task 6: Docs
- `.env.example` (`TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`, platform credentials, `CONNECT_SIMULATION`), setup checklist redirect URIs, API notes versions, README roadmap. Commit `docs: ...`.
