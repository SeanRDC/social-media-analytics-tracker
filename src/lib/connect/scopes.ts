/**
 * The permissions Ispector asks each platform for. The login code requests
 * exactly these, and the privacy policy lists them from here, so the two can't
 * disagree. Adding one here needs a new platform review first (docs/platforms/app-review.md).
 * No imports, so the legal pages can use it.
 */

export const YOUTUBE_SCOPES = ["https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/yt-analytics.readonly"];

// pages_read_user_content is needed to list the Page's posts (/published_posts)
const FACEBOOK_SCOPES = ["pages_show_list", "pages_read_engagement", "pages_read_user_content", "read_insights"];
// business_management: Pages and Instagram accounts in a business portfolio only show their link with it
const INSTAGRAM_ONLY = ["instagram_basic", "instagram_manage_insights", "business_management"];
/**
 * Facebook and Instagram ask for the same permissions: each new Meta login
 * replaces the app's access to the Page (the old Page token then fails with
 * 190/492), so either login has to produce a token that serves both.
 */
export const META_SCOPES = [...FACEBOOK_SCOPES, ...INSTAGRAM_ONLY];

export const TIKTOK_SCOPES = ["user.info.basic", "user.info.profile", "user.info.stats", "video.list"];

export const LINKEDIN_SCOPES = ["r_organization_social", "rw_organization_admin"];

/** A scope as people know it: Google's are URLs, named by their last part. */
export const scopeName = (scope: string) => scope.slice(scope.lastIndexOf("/") + 1);
