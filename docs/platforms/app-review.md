# App review submission guide

Everything needed to submit Ispector for review at Google, Meta, TikTok and LinkedIn.
Last checked against the platforms' published requirements on 2026-11-20.

## Rules every reviewer applies

- `https://ispector.site` is public, explains what the app does, and links to Privacy, Terms and Data deletion in the footer. Don't put the homepage behind sign-in or a redirect.
- Every permission we request must be shown working in the demo video. Unused permissions are the most common rejection reason. We request only what the code uses (see "Permissions and where they show" below).
- The video starts **signed out**. It shows sign-in, then the platform's own consent screen listing the permissions, then the screens that display the data.
- Use real data in the video, not the simulated accounts.

## Reviewer account

Reviewers can't receive our sign-in emails, so they get a password account. Sign-up with a password stays closed.

1. Pick a reviewer address, for example `review@ispector.site` (it can forward to support@ like the other aliases).
2. Generate a password of at least 16 characters: `openssl rand -base64 18`.
3. Create the account on production (Neon):
   `DATABASE_URL=<Neon URL from .env.vercel> REVIEWER_EMAIL=review@ispector.site REVIEWER_PASSWORD=<password> node scripts/create-reviewer.mjs`
   Running it again resets the password and signs out earlier reviewer sessions.
4. In Vercel, set `REVIEWER_EMAIL=review@ispector.site` (Production) and redeploy. The sign-in page then shows a collapsed **App reviewer sign-in** section.
5. Give reviewers these instructions:
   > Open https://ispector.site/sign-in, expand "App reviewer sign-in" at the bottom, and sign in with the email and password below. Accept the terms on the next screen. Then choose "Connect" for the platform under review (or go to Settings → Connected accounts) and approve access with your test account.
6. After all reviews are approved, remove `REVIEWER_EMAIL` from Vercel to turn password sign-in off.

Password sign-in allows 5 attempts per 10 minutes per IP address.

## Data handling answers (same for every platform)

- **Read-only:** we never post, comment or change anything on the person's accounts.
- **Storage:** daily statistics and post metrics are stored in our database (Neon Postgres, Singapore) to draw charts over time. Platform tokens are encrypted with AES-256-GCM.
- **Deletion:**
  - Disconnecting a platform in Settings deletes its tokens and data straight away.
  - Deleting the account deletes everything.
  - If access is revoked on the platform's side, or stops working and isn't reconnected within 7 days, the connection and all its data are deleted automatically. The person is warned when access is lost, again 2 days before, and told when the deletion is done.
- **Sharing:** none. Data is only shown to the signed-in owner. It is never sold, never used for ads, and never used to train AI.
- **Data deletion page:** https://ispector.site/data-deletion

## Permissions and where they show

| Platform | Permission | Used for | Show in the video |
| --- | --- | --- | --- |
| YouTube | `youtube.readonly` | Channel name and subscribers, video list with titles and thumbnails | Settings (channel name), Platforms → YouTube, Content |
| YouTube | `yt-analytics.readonly` | Daily views, subscribers gained, engagement | Overview "Views per day" with the YouTube line, Platforms → YouTube |
| Meta | `pages_show_list` | Finding the Page the person manages | Choosing the Page in Meta's dialog; Page name in Settings |
| Meta | `pages_read_engagement` | Page followers, post reactions and comments | Platforms → Facebook |
| Meta | `pages_read_user_content` | The Page's published posts | Content, filtered to Facebook |
| Meta | `read_insights` | Daily Page views and engagement, per-post views | Overview chart (Facebook line), Platforms → Facebook |
| Meta | `instagram_basic` | Instagram account name, posts and reels | Settings (account), Content filtered to Instagram |
| Meta | `instagram_manage_insights` | Daily views and interactions, audience age, gender and country | Platforms → Instagram, Audience |
| Meta | `business_management` | Finding the Instagram account linked to a Page in a business portfolio | Meta's dialog showing the business assets, then Instagram connected in Settings |
| TikTok | `user.info.basic` | Account id and display name | Settings (account) |
| TikTok | `user.info.profile` | @username shown on the connection | Settings (@username) |
| TikTok | `user.info.stats` | Followers, likes and video counts | Platforms → TikTok |
| TikTok | `video.list` | Recent videos with views, likes, comments, shares | Content filtered to TikTok |
| LinkedIn | `rw_organization_admin` | Finding the company Pages the person administers; follower and share statistics | Settings (Page name), Platforms → LinkedIn |
| LinkedIn | `r_organization_social` | The Page's posts and their statistics | Content filtered to LinkedIn |

`rw_organization_admin` is the only LinkedIn permission that returns a Page's admin list and statistics. Tell the reviewer that we only read with it and never write.

## Google (YouTube)

Before submitting:
1. Verify `ispector.site` in Google Search Console with the Google account that owns the "Ispector" Cloud project.
2. On the OAuth consent screen, set:
   - App name "Ispector" and the app logo
   - Homepage `https://ispector.site`
   - Privacy `https://ispector.site/privacy`
   - Terms `https://ispector.site/terms`
   - Authorized domain `ispector.site`
3. Remove the localhost redirect URIs from the production client (keep a separate dev client for localhost).
4. Publish the app (Testing → In production). This starts brand verification and sensitive-scope verification.

Demo video (upload to YouTube as **Unlisted**):
1. Show the browser address bar at https://ispector.site, then sign in.
2. Go to Settings → Connected accounts → YouTube → Connect. On Google's screen, show the app name and expand the details to show the **OAuth client ID** in the URL (`client_id=`). Approve both permissions.
3. Show the channel name in Settings.
4. Open Overview → Views per day with the YouTube line, Platforms → YouTube (subscribers, daily views), and Content (videos).
5. Show Disconnect in Settings, and the privacy policy section on Google user data (Limited Use, link to Google's permissions page).

Write the justification as: "Ispector is a read-only analytics dashboard. youtube.readonly reads the user's own channel and video list to show subscribers and per-video performance. yt-analytics.readonly reads daily views and subscriber changes for charts. Data is shown only to the channel owner and deleted on disconnect or within 7 days of revocation."

## Meta (Facebook and Instagram)

Before submitting:
1. Complete Business Verification (required for Advanced Access).
2. Under App settings → Basic, set:
   - App icon `docs/brand/ispector-icon-1024.png`
   - Privacy policy `https://ispector.site/privacy`
   - Terms `https://ispector.site/terms`
   - User data deletion: instructions URL `https://ispector.site/data-deletion`
   - Category: Business and pages
3. Request Advanced Access for each permission in the table, with the reviewer instructions from "Reviewer account" above.

Screencast: **one per permission**, each starting signed out. In each one:
1. Sign in to Ispector (reviewer account).
2. Settings → Facebook (or Instagram) → Connect.
3. Show Meta's dialog with the Page and Instagram account ticked. Both must be ticked.
4. Show the screen from the table where that permission's data appears.
5. For `read_insights` and `instagram_manage_insights`, the analytics must be visibly on screen: the chart with numbers, and the Audience page.

## TikTok

Before submitting:
1. In the app settings, set the website `https://ispector.site`, the Terms and Privacy URLs, and the app icon.
2. Products: Login Kit + Display API (the four permissions above only).

Demo video (up to 5 files, 50 MB each), recorded with the sandbox keys and a sandbox test account that has posted videos:
1. Sign in to Ispector.
2. Settings → TikTok → Connect. Show TikTok's consent screen listing the four permissions.
3. Show the @username in Settings, Platforms → TikTok (followers, likes, videos), and Content filtered to TikTok.
4. Show Disconnect.

In the form, explain each permission in one sentence using the table above.

## LinkedIn

1. Check first that the Developer Portal offers **Community Management API** for this app. One source says `r_organization_social` is only granted to select developers.
2. If it's offered, request access (Development tier first). It may need to be the only product on the app; if so, create a separate LinkedIn app for it.
3. Prepare a screencast: sign in, Settings → LinkedIn → Connect, LinkedIn's consent screen, then the Page name in Settings, Platforms → LinkedIn and Content filtered to LinkedIn.
4. Standard tier may include a live demo with LinkedIn. Use the reviewer account so nothing personal shows.

## After approval

- Don't add permissions without a new review. An unreviewed permission shows users an "unverified app" warning (Google) or fails (Meta, TikTok).
- Changing the app name, logo, homepage or privacy URL at Google triggers re-verification.
- Keep the privacy policy's permission list in sync with `src/lib/connect/providers/*` whenever scopes change.
- Meta runs an annual Data Use Checkup. Answer it from "Data handling answers" above.
