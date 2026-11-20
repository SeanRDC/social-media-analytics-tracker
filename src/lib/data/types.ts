export type Range = 7 | 30 | 90;
export const RANGES: readonly Range[] = [7, 30, 90];

export type PlatformId = "youtube" | "facebook" | "tiktok" | "linkedin" | "instagram" | "x";

/** Fixed order: the colour palette is validated for neighbours in this order. */
export const PLATFORM_ORDER: readonly PlatformId[] = ["youtube", "facebook", "tiktok", "linkedin", "instagram", "x"];

export type ConnectionStatus = "connected" | "needs-professional" | "not-connected" | "expired";

/** How a platform can be connected right now: for real, simulated locally, or not at all. */
export type ConnectMode = "live" | "simulated" | "unavailable";

/** One row in onboarding and Settings. */
export interface ConnectionView {
  id: PlatformId;
  name: string;
  /** Account name or handle; empty when not connected. */
  account: string;
  status: ConnectionStatus;
  mode: ConnectMode;
  /** When numbers last arrived (ISO), if ever. */
  updatedAt?: string | null;
  /** Why the last import attempt failed, if it did. */
  syncError?: string | null;
  /** For a connection that lost access: when its stored data will be deleted (ISO). */
  deleteOn?: string | null;
}

/*
 * Numbers are exactly what the platforms reported. null means "not reported"
 * (no data yet for that period), never zero and never an estimate. When a
 * period is only partly reported, `dataSince` is the first reported day in it.
 */

export interface Platform {
  id: PlatformId;
  name: string;
  /** Account name or handle on that platform. */
  account: string;
  status: ConnectionStatus;
  /** Latest reported total. */
  followers: number | null;
  /** Followers gained in each range, from reported days only. */
  followerGrowth: Record<Range, number | null>;
  /** Engagement rate, percent, last 30 days, from reported days only. */
  engagement: number | null;
  views30: number | null;
  /** First reported day in the last 30 days, when that is later than the window start. */
  dataSince: string | null;
  posts30: number;
  /**
   * Views on the imported posts: the sum of each post's view count exactly as the
   * platform reports it (available from the first import, unlike daily views).
   */
  postViews: number;
  /** How many imported posts `postViews` adds up. */
  postCount: number;
  /** Average reported views of posts published in the last 30 days; null when none were. */
  viewsPerPost30: number | null;
  /** Reported daily follower totals for the last 31 days, oldest first; null where not reported. */
  trend: (number | null)[];
  /** What the platform calls its followers. */
  followerNoun: string;
}

export interface Metrics {
  followers: number | null;
  followerDelta: number | null;
  views: number | null;
  /** Percent change in views vs. the previous period; null unless both periods are fully reported. */
  viewsChange: number | null;
  engagement: number | null;
  /** Change in engagement rate, percentage points; null unless both periods are fully reported. */
  engagementChange: number | null;
  posts: number;
  /** First day any connected platform reported in this period, when later than its start. */
  dataSince: string | null;
  /** Both periods were fully reported (a null change then means the earlier period had no views). */
  comparable: boolean;
}

export interface Overview {
  accountName: string;
  connectedCount: number;
  metrics: Record<Range, Metrics>;
  weekGrowth: { day: string; value: number | null }[];
  topPlatform: PlatformId;
  /** Daily total followers for the last 31 days; null on days a platform did not report. */
  trend: (number | null)[];
  /** First day of `trend`, ISO date. */
  trendStart: string;
}

/** Views per day across all platforms, this week vs last week (Mon–Sun). */
export interface DailyViews {
  days: string[];
  thisWeek: (number | null)[];
  lastWeek: (number | null)[];
  /** This week's views for each connected platform, in platform order; null = not reported that day. */
  byPlatform: { platform: PlatformId; thisWeek: (number | null)[] }[];
  /** Index of today within the week. */
  todayIndex: number;
}

export type PostKind = "video" | "short" | "reel" | "post";

export interface Post {
  id: string;
  title: string;
  platform: PlatformId;
  kind: PostKind;
  publishedAt: string;
  views: number;
  /** Engagement rate, percent. */
  engagement: number;
  avgWatchSeconds: number | null;
  likes: number;
  comments: number;
  shares: number;
  thumb: "a" | "b" | "c" | "d";
  /** The platform's own thumbnail, when it provides one (the placeholder art shows otherwise). */
  thumbnailUrl?: string;
  /** Link to the post on its platform. */
  permalink?: string;
  insight?: string;
}

export type PostSort = "views" | "engagement" | "date";

/** Which posts to list, and in what order. */
export interface PostQuery {
  platform?: PlatformId;
  kind?: PostKind;
  sort?: PostSort;
}

export interface Audience {
  /** Platforms whose demographics are included (not every platform shares them). */
  sources: PlatformId[];
  ages: { label: string; share: number }[];
  countries: { name: string; share: number }[];
  slotLabels: string[];
  bestTimes: { day: string; slots: number[] }[];
  /** The IANA time zone the best times are grouped in, e.g. "Asia/Manila". */
  timeZone: string;
}
