# Platform API notes

Verified 2026-11-15 against official docs where available (versions re-checked 2026-11-16 for phase 2). Platform APIs change often: re-check each section when its phase starts.

## Connection framework (phase 2)

Each platform's OAuth details live in `src/lib/connect/providers/`. Callback URL: `<site>/api/connect/<platform>/callback`.

| Platform | Token lifetime | Refresh | Stored token |
|---|---|---|---|
| YouTube | about 1 hour | refresh token (PKCE, `access_type=offline`, `prompt=consent`) | user token |
| Facebook | Page token does not expire | none needed | first managed Page's token |
| Instagram | never (Page token) | none | Page token of the Page the Instagram account is linked to |
| TikTok | about 24 hours | refresh token (about a year) | user token |
| LinkedIn | 60 days | refresh tokens only for approved partners; otherwise reconnect | user token |

- **Versions:** Graph API `v26.0` (released 2026-07-29), override with `META_GRAPH_VERSION`. LinkedIn `LinkedIn-Version: 202607`, override with `LINKEDIN_API_VERSION`; retired versions return 426.
- **Multiple Pages:** v1 connects the first Facebook Page or LinkedIn organization the person manages. A picker can come later.
- Sources: [Graph API v26.0](https://developers.facebook.com/docs/graph-api/changelog/version26.0), [LinkedIn versioning](https://learn.microsoft.com/en-us/linkedin/marketing/versioning), [Business Login for Instagram](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login), [LinkedIn organization access control](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-access-control-by-role)

## YouTube (phase 3)

**As built (2026-11-16):** `src/lib/sync/youtube.ts`.
- Data API: `channels?mine=true` (subscribers, uploads playlist), `playlistItems` (200 most recent uploads), `videos` (title, thumbnail, duration, lifetime views, likes, comments).
- Analytics API, `ids=channel==MINE`: `dimensions=day` with `views, estimatedMinutesWatched, subscribersGained, subscribersLost, likes, comments, shares`; `dimensions=video` for average view duration and shares; `ageGroup,gender` (`viewerPercentage`) and `country` (`views`). The last three are optional: small channels get no demographics and a failure there keeps the rest.
- First import reads 180 days; daily syncs re-read from three days before the last one, because Analytics finalises recent days late (about two days behind).
- Subscriber totals per day are rebuilt backwards from today's count using daily net change. YouTube rounds public subscriber counts, so totals are approximate.
- There is no Shorts flag: videos of 3 minutes or less are labelled Shorts.
- Quota per sync is small: about 3 Data API calls per 50 videos plus 4 Analytics reports.

- **APIs:** YouTube Data API v3 (channel and video details) and YouTube Analytics API v2 (daily metrics, demographics).
- **Scopes:** `https://www.googleapis.com/auth/youtube.readonly`, `https://www.googleapis.com/auth/yt-analytics.readonly`.
- **Daily history:** Analytics reports accept `dimensions=day` with metrics such as `views`, `estimatedMinutesWatched`, `averageViewDuration`, `subscribersGained`, one row per day, so history can be backfilled on first import. Not every metric and dimension pairing is valid; check the channel reports reference.
- **Quota:** Data API has a 10,000-unit daily default; the Analytics API quota is separate. Confirm both in the Google Cloud console for the project.
- **Review:** Sensitive scopes need Google OAuth verification before public launch; until then up to 100 test users can sign in.
- Sources: [sample requests](https://developers.google.com/youtube/analytics/sample-requests), [data model](https://developers.google.com/youtube/analytics/v1)

## Instagram (phase 4)

**As built (2026-11-16):** `src/lib/sync/instagram.ts`. `/{ig-id}?fields=username,followers_count`, `/{ig-id}/media` (100 most recent, with `insights.metric(views,shares)`; retried without insights if refused), `follower_demographics` with `metric_type=total_value` and `breakdown=age|country|gender` (optional). Instagram reports totals, so daily rows are derived from the change between syncs and history starts on the day of connection. **Verify with an approved account:** the `views`/`shares` media insight names and the demographics response shape.

- **API (changed 2026-11-19):** Instagram API with **Facebook Login** (`graph.facebook.com`), through the same Meta app as Facebook. Meta no longer offers Instagram Login to new apps: every new app gets Facebook Login for Business, and the Instagram use case only shows "Unified login" and "Facebook login". The Instagram account must be Professional and linked to a Facebook Page; it is found with `/me/accounts?fields=instagram_business_account{id,username}` and read by its id with the Page token. Unified Login (business portfolio + `config_id`, system-user tokens) is the possible future path.
- **Permissions:** `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`, `business_management` (without it, Pages in a business portfolio return no `instagram_business_account`; `connected_instagram_account` is checked too). Advanced access (App Review) is needed for users outside the app's roles.
- **Limits:** Professional (Business or Creator) accounts only. `follower_count` and `online_followers` are unavailable under 100 followers. Data can lag up to 48 hours. `impressions` is deprecated; use the current metric list.
- Sources: [account insights](https://developers.facebook.com/docs/instagram-platform/api-reference/instagram-user/insights), [Instagram Login insights announcement](https://developers.facebook.com/blog/post/2025/03/24/user-and-media-insights-on-instagram-api-with-instagram-login/), [media insights](https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights/)

## Facebook Pages (phase 4)

**As built (2026-11-16):** `src/lib/sync/facebook.ts`. `/{page}?fields=followers_count`, daily `page_daily_follows_unique`, `page_daily_unfollows_unique`, `page_media_view`, `page_post_engagements` (each requested alone, 90-day chunks, unavailable ones skipped; with none at all the sync derives daily rows from totals), `published_posts` with reaction/comment summaries, shares and `insights.metric(post_media_view)`. No demographics. **Verify with an approved app:** each metric name against the current Page Insights reference (Meta keeps retiring metrics).

- **Permissions:** Facebook Login with page read permissions (`pages_show_list`, `pages_read_engagement`, `pages_read_user_content` for `published_posts`, `read_insights`); App Review required.
- **Metric changes:** On 2025-11-15 Meta removed legacy metrics: `page_fans` → `page_follows`, `page_impressions*` → `page_media_view`, post impressions → `post_media_view`. Removed metrics return an invalid-metric error. More Page Insights metrics (reported to include unique reach) are scheduled for removal on 2026-06-15; check the deprecated-metrics page before building.
- Sources: [deprecated metrics](https://developers.facebook.com/documentation/pages-api/platforminsights/page/deprecated-metrics), [Aug 2025 update](https://developers.facebook.com/blog/post/2025/08/15/page-insights-api-updates/), [Page insights reference](https://developers.facebook.com/docs/graph-api/reference/page/insights/)

## TikTok (phase 5)

**As built (2026-11-16):** `src/lib/sync/tiktok.ts`. `GET /v2/user/info/?fields=open_id,follower_count,likes_count,video_count` and `POST /v2/video/list/` (20 per page, 100 videos) with `view_count, like_count, comment_count, share_count`. Daily rows are derived from the change between syncs. **Verify:** the stats fields require `user.info.stats` / `video.list`; a 2026-11-16 search did not confirm the count fields on the v2 reference pages.

- **API:** Login Kit + Display API.
- **Scopes:** `user.info.basic`, `user.info.profile`, `user.info.stats` (follower, following, likes and video counts), `video.list` (recent videos).
- **PKCE (2026-11-19):** TikTok now rejects web logins without `code_challenge`. It wants S256 with the SHA-256 **hex**-encoded (not base64url), and `code_verifier` on the token exchange.
- **Gotchas:** Users can approve some scopes and decline others; read the granted `scope` from the token response. Access tokens are short-lived (about 24 hours), so refresh is mandatory. Confirm `view_count` on the video list endpoint against the official spec. No audience demographics in the Display API.
- Sources: [scopes](https://developers.tiktok.com/doc/tiktok-api-scopes/), [user info scope migration](https://developers.tiktok.com/bulletin/user-info-scope-migration), [Display API overview](https://developers.tiktok.com/docs/en/display-api-get-started)

## LinkedIn (phase 5)

**As built (2026-11-16):** `src/lib/sync/linkedin.ts`. Total from `networkSizes/{org}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`; daily `organizationalEntityFollowerStatistics` (`followerGains`) and `organizationalEntityShareStatistics` (impressions as views) with `timeIntervals` in Rest.li 2.0 syntax; posts from `/rest/posts?q=author` with per-post share statistics. No demographics (no age facet; countries are geo ids). **Verify:** `followerGains` field names and that the share statistics finder is enabled for the approved tier.

- **API:** Community Management API (organization pages only; personal profiles are not available).
- **Access:** Request form plus vetting; apps start on a Development tier with limited call volume, and Standard tier needs a screen recording. A rejected app cannot re-apply; a new app is required. Use the versioned `/rest/` endpoints.
- **Follower statistics:** `organizationalEntityFollowerStatistics` returns lifetime follower demographics or time-bound follower stats. Community reports show 403s even with `rw_organization_admin`, so confirm the endpoint is enabled for the approved product tier.
- Sources: [follower statistics](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/follower-statistics), [app review](https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review), [overview](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview)

## X

Out of scope (paid read access).

## App sign-in library

Auth.js's own README now recommends Better Auth for new projects (Better Auth's team took over Auth.js maintenance in September 2025). Source: [Auth.js README](https://cdn.jsdelivr.net/gh/nextauthjs/next-auth@main/README.md)
