# Platform API notes

Verified 2026-11-15 against official docs where available (versions re-checked 2026-11-16 for phase 2). Platform APIs change often: re-check each section when its phase starts.

## Connection framework (phase 2)

Each platform's OAuth details live in `src/lib/connect/providers/`. Callback URL: `<site>/api/connect/<platform>/callback`.

| Platform | Token lifetime | Refresh | Stored token |
|---|---|---|---|
| YouTube | about 1 hour | refresh token (PKCE, `access_type=offline`, `prompt=consent`) | user token |
| Facebook | Page token does not expire | none needed | first managed Page's token |
| Instagram | 60 days | `ig_refresh_token` within the last 10 days | long-lived user token |
| TikTok | about 24 hours | refresh token (about a year) | user token |
| LinkedIn | 60 days | refresh tokens only for approved partners; otherwise reconnect | user token |

- **Versions:** Graph API `v26.0` (released 2026-07-29), override with `META_GRAPH_VERSION`. LinkedIn `LinkedIn-Version: 202607`, override with `LINKEDIN_API_VERSION`; retired versions return 426.
- **Multiple Pages:** v1 connects the first Facebook Page or LinkedIn organization the person manages. A picker can come later.
- Sources: [Graph API v26.0](https://developers.facebook.com/docs/graph-api/changelog/version26.0), [LinkedIn versioning](https://learn.microsoft.com/en-us/linkedin/marketing/versioning), [Business Login for Instagram](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login), [LinkedIn organization access control](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-access-control-by-role)

## YouTube (phase 3)

- **APIs:** YouTube Data API v3 (channel and video details) and YouTube Analytics API v2 (daily metrics, demographics).
- **Scopes:** `https://www.googleapis.com/auth/youtube.readonly`, `https://www.googleapis.com/auth/yt-analytics.readonly`.
- **Daily history:** Analytics reports accept `dimensions=day` with metrics such as `views`, `estimatedMinutesWatched`, `averageViewDuration`, `subscribersGained`, one row per day, so history can be backfilled on first import. Not every metric and dimension pairing is valid; check the channel reports reference.
- **Quota:** Data API has a 10,000-unit daily default; the Analytics API quota is separate. Confirm both in the Google Cloud console for the project.
- **Review:** Sensitive scopes need Google OAuth verification before public launch; until then up to 100 test users can sign in.
- Sources: [sample requests](https://developers.google.com/youtube/analytics/sample-requests), [data model](https://developers.google.com/youtube/analytics/v1)

## Instagram (phase 4)

- **API:** Instagram API with Instagram Login (`graph.instagram.com`) now includes account and media insights, so a linked Facebook Page is no longer required for that path.
- **Permissions:** `instagram_business_basic`, `instagram_business_manage_insights`. Advanced access (App Review) is needed for users outside the app's roles.
- **Limits:** Professional (Business or Creator) accounts only. `follower_count` and `online_followers` are unavailable under 100 followers. Data can lag up to 48 hours. `impressions` is deprecated; use the current metric list.
- Sources: [account insights](https://developers.facebook.com/docs/instagram-platform/api-reference/instagram-user/insights), [Instagram Login insights announcement](https://developers.facebook.com/blog/post/2025/03/24/user-and-media-insights-on-instagram-api-with-instagram-login/), [media insights](https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights/)

## Facebook Pages (phase 4)

- **Permissions:** Facebook Login with page read permissions (for example `pages_show_list`, `pages_read_engagement`, `read_insights`); App Review required.
- **Metric changes:** On 2025-11-15 Meta removed legacy metrics: `page_fans` → `page_follows`, `page_impressions*` → `page_media_view`, post impressions → `post_media_view`. Removed metrics return an invalid-metric error. More Page Insights metrics (reported to include unique reach) are scheduled for removal on 2026-06-15; check the deprecated-metrics page before building.
- Sources: [deprecated metrics](https://developers.facebook.com/documentation/pages-api/platforminsights/page/deprecated-metrics), [Aug 2025 update](https://developers.facebook.com/blog/post/2025/08/15/page-insights-api-updates/), [Page insights reference](https://developers.facebook.com/docs/graph-api/reference/page/insights/)

## TikTok (phase 5)

- **API:** Login Kit + Display API.
- **Scopes:** `user.info.basic`, `user.info.profile`, `user.info.stats` (follower, following, likes and video counts), `video.list` (recent videos).
- **Gotchas:** Users can approve some scopes and decline others; read the granted `scope` from the token response. Access tokens are short-lived (about 24 hours), so refresh is mandatory. Confirm `view_count` on the video list endpoint against the official spec. No audience demographics in the Display API.
- Sources: [scopes](https://developers.tiktok.com/doc/tiktok-api-scopes/), [user info scope migration](https://developers.tiktok.com/bulletin/user-info-scope-migration), [Display API overview](https://developers.tiktok.com/docs/en/display-api-get-started)

## LinkedIn (phase 5)

- **API:** Community Management API (organization pages only; personal profiles are not available).
- **Access:** Request form plus vetting; apps start on a Development tier with limited call volume, and Standard tier needs a screen recording. A rejected app cannot re-apply; a new app is required. Use the versioned `/rest/` endpoints.
- **Follower statistics:** `organizationalEntityFollowerStatistics` returns lifetime follower demographics or time-bound follower stats. Community reports show 403s even with `rw_organization_admin`, so confirm the endpoint is enabled for the approved product tier.
- Sources: [follower statistics](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/follower-statistics), [app review](https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review), [overview](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview)

## X

Out of scope (paid read access).

## App sign-in library

Auth.js's own README now recommends Better Auth for new projects (Better Auth's team took over Auth.js maintenance in September 2025). Source: [Auth.js README](https://cdn.jsdelivr.net/gh/nextauthjs/next-auth@main/README.md)
