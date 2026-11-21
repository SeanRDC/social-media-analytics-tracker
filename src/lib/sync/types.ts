import type { PostKind } from "@/lib/data/types";

/**
 * One day of account numbers exactly as the platform reported them. `followers`
 * is the total at the end of that day. null = not reported (never an estimate).
 */
export interface DailyRow {
  date: string;
  followers: number | null;
  followersGained: number | null;
  views: number | null;
  engagements: number | null;
  posts: number;
  watchMinutes: number | null;
}

/** A post with its lifetime totals as of the sync. */
export interface PostRow {
  externalId: string;
  title: string;
  kind: PostKind;
  publishedAt: Date;
  thumbnailUrl: string | null;
  permalink: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  avgWatchSeconds: number | null;
}

/** A post's views in its first week, from the platform's daily numbers (YouTube); see firstWeekRange(). */
export interface FirstWeekRow {
  externalId: string;
  views: number;
}

/** Share of the audience, percent. Age keys are labels such as "25–34"; country keys are ISO codes. */
export interface AudienceRow {
  dimension: "age" | "country" | "gender";
  key: string;
  share: number;
}

/** Everything one sync reads from a platform, already normalised. */
export interface PlatformSnapshot {
  followers: number;
  daily: DailyRow[];
  posts: PostRow[];
  /** null when the platform does not share demographics (or refused this time); stored shares are kept. */
  audience: AudienceRow[] | null;
  /**
   * The platform only reports current totals (Instagram, TikTok): the sync writes
   * today's row from the change since the previous sync instead of `daily`.
   */
  derive?: boolean;
  /** Followers online per hour, as reported (Instagram only; absent when not shared). */
  onlineFollowers?: OnlineHourRow[];
  /** First-week views read this sync, for posts from this sync or stored earlier. */
  firstWeeks?: FirstWeekRow[];
}

/** How many followers were online in the hour starting at `hourStart`. */
export interface OnlineHourRow {
  hourStart: Date;
  followers: number;
}

/** What a fetcher knows about the connected account. */
export interface FetchContext {
  /** The platform's id for the account (Page id, organization id, …). */
  externalId: string;
  /** How many of the most recent posts to read: more on the first import, so older posts are included too. */
  maxPosts: number;
  /** Posts (external ids) whose first-week views are already stored, so they aren't read again. */
  firstWeekKnown?: ReadonlySet<string>;
  /** Stored posts still without first-week views, including ones older than this sync's post list reaches. */
  firstWeekMissing?: { externalId: string; publishedAt: Date }[];
}

export interface SyncWindow {
  start: string;
  end: string;
}
