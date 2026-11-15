# Setup checklist (owner)

Things only the account owner can do, because they need your logins. Start the platform reviews early: they take days to weeks and building continues meanwhile.

Replace `https://YOUR-DOMAIN` with the Vercel URL (or your own domain) once it exists. For local work, the base URL is `http://localhost:3000`.

## 1. Hosting and database (phase 1)

- [ ] Create a **Neon** project (free tier is fine). Copy the **pooled** connection string into `DATABASE_URL`.
- [ ] Create a **Vercel** project from the GitHub repo. Add every variable from `.env.example` in Project Settings → Environment Variables.
- [ ] Generate `BETTER_AUTH_SECRET` with `npx @better-auth/cli secret` (or any 32+ random bytes) and set `BETTER_AUTH_URL` to the site URL.
- [ ] Run `npm run db:migrate` once against Neon (locally with `DATABASE_URL` set, or as a Vercel build step).

## 2. Email for sign-in links (phase 1, optional until launch)

- [ ] Create a **Resend** account, verify a sending domain, set `RESEND_API_KEY` and `EMAIL_FROM`. Without them, sign-in links are printed in the server log (fine for development).

## 3. Google: app sign-in now, YouTube in phase 3

- [ ] Google Cloud console → new project → OAuth consent screen (External). Add privacy and terms URLs: `https://YOUR-DOMAIN/privacy`, `https://YOUR-DOMAIN/terms`.
- [ ] Credentials → OAuth client (Web). Redirect URIs: `http://localhost:3000/api/auth/callback/google` and `https://YOUR-DOMAIN/api/auth/callback/google`. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- [ ] Phase 3: enable **YouTube Data API v3** and **YouTube Analytics API**; add test users; later submit for verification of the YouTube read-only scopes.

## 4. Apple sign-in (optional)

- [ ] Apple Developer account → Services ID with Sign in with Apple, return URL `https://YOUR-DOMAIN/api/auth/callback/apple` (Apple requires HTTPS). Set `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET`.

## 5. Meta: Facebook + Instagram (phase 4, start review early)

- [ ] developers.facebook.com → create a Business app. Add Facebook Login and Instagram (Instagram Login) products.
- [ ] Settings: privacy policy `https://YOUR-DOMAIN/privacy`, terms `https://YOUR-DOMAIN/terms`, data deletion instructions `https://YOUR-DOMAIN/data-deletion`.
- [ ] Request advanced access for the insights permissions listed in `api-notes.md`; record the screencast once phase 4 is built.

## 6. TikTok (phase 5)

- [ ] developers.tiktok.com → create an app with Login Kit and Display API; request `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list`. Add the same privacy and terms URLs.

## 7. LinkedIn (phase 5)

- [ ] LinkedIn developer portal → create an app tied to a LinkedIn Page you admin → request **Community Management API** access (Development tier first). A rejected app can't re-apply, so fill the form carefully.

## Before any review: replace placeholders

- [ ] Legal pages use `LEGAL_CONTACT_EMAIL` and the app name from `src/lib/brand.ts`. Have them reviewed for your jurisdiction before launch; they are a starting draft, not legal advice.
