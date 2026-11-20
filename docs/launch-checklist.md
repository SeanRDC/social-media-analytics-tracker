# Launch checklist

Everything the code can do is built (phases 0–7). This is what stands between it and real users. Work through `docs/platforms/setup-checklist.md` first for accounts and keys.

## 1. Production settings

- [ ] Vercel has every variable from `.env.example` that applies. On each new deployment the server checks them at start-up and logs `config_error` / `config_warning` lines: open the deployment's logs and fix any it reports.
- [ ] `TOKEN_ENCRYPTION_KEY` is backed up somewhere safe (a password manager). Losing or changing it means everyone reconnects their platforms.
- [ ] Build command is `npm run db:migrate && npm run build`, so each deployment applies new migrations (`drizzle/0001…`, `0002…`).

## 2. Jobs and monitoring

- [ ] Vercel → Project → Cron Jobs lists `/api/cron/daily` at 04:00 and 06:00 UTC. Run it once by hand from there and check the response shows `"ok": true`.
- [ ] Point an uptime monitor (Better Stack, UptimeRobot, Vercel's own checks) at `https://YOUR-DOMAIN/api/health`. It returns 503 when the database is unreachable and `"late": true` when the nightly job hasn't run for 30 hours.
- [ ] Optional: set `ALERT_WEBHOOK_URL` to a Slack or Discord incoming webhook. A nightly run with failures posts a summary there.
- [ ] Know where to look: Vercel logs are JSON lines; filter by `event` (`request_error`, `sync_failed`, `job_finished`, `config_error`).

## 3. Platforms

- [ ] Each platform app is approved for the scopes in `docs/platforms/api-notes.md` (Google verification, Meta App Review, TikTok, LinkedIn Community Management). Follow `docs/platforms/app-review.md`: reviewer account, permission table, demo video scripts.
- [ ] After every review is approved, remove `REVIEWER_EMAIL` from Vercel so password sign-in is off.
- [ ] With a real account on each platform: connect, import, and compare a few numbers with the platform's own dashboard. Check the "Verify" notes per platform in `api-notes.md` (field and metric names that could not be confirmed without access).
- [ ] Check quotas in each developer console (YouTube Data API: 10,000 units a day by default). Accounts that hit a quota are skipped and retried the next run; Settings tells the person.

## 4. Email and notifications

- [ ] Resend domain verified (SPF and DKIM pass). Send yourself a sign-in link, turn on the weekly email, and check both land in the inbox, not spam.
- [ ] If push is on: subscribe on a phone (iPhone: add to Home Screen first) and wait for an alert, or temporarily lower an alert threshold in a test deployment.

## 5. Security and privacy

- [ ] Privacy policy, terms and data deletion pages reviewed for your jurisdiction (they are drafts) and `LEGAL_CONTACT_EMAIL` set.
- [ ] Try Settings → Delete account with a test account: you are signed out, the platform shows our app removed, and signing in again starts fresh.
- [ ] Rate limits are on in production: sign-in links and reviewer password attempts (5 per 10 minutes per IP each), connecting (20/hour), imports (6/hour per platform), exports (60/hour) and push sign-ups (20/hour) per person.
- [ ] Response headers on the live site include `Content-Security-Policy`, `X-Frame-Options: DENY`, `Strict-Transport-Security` and `X-Content-Type-Options: nosniff` (check with your browser's network tab or securityheaders.com).
- [ ] Keep dependencies patched: run `npm audit` monthly and watch the Next.js, React and Better Auth security advisories. Dev-only advisories (vitest, drizzle-kit) don't ship to the site but should be cleared when a non-breaking upgrade exists.
- [ ] New connections that lose access are deleted after 7 days by the nightly job (`purgeLostAccess`). Check `job_finished` logs show `retention` with `failed: 0`.

## 6. Scale (when it matters)

- [ ] The nightly job syncs four accounts at a time and stops starting new ones after four minutes; the 06:00 run finishes the rest. If `"remaining"` in the job summary stays above zero, add more runs to `vercel.json` (Vercel Pro allows hourly) or raise the concurrency in `src/lib/sync/service.ts`.
- [ ] Neon: watch storage and compute in the console; `daily_stat` and `post_stat` grow by about one row per account and post per day.

## Known gaps

- The Content-Security-Policy allows inline scripts (no nonces, which would make every page render per request); everything else is restricted to our own origin, with images from any HTTPS host for platform thumbnails.
- The PDF export uses the browser's print dialog rather than a generated file.
