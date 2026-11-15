export type Range = 7 | 30 | 90;
export const RANGES: readonly Range[] = [7, 30, 90];

export type PlatformId = "youtube" | "facebook" | "tiktok" | "linkedin" | "instagram" | "x";

/** Fixed order: the colour palette is validated for neighbours in this order. */
export const PLATFORM_ORDER: readonly PlatformId[] = ["youtube", "facebook", "tiktok", "linkedin", "instagram", "x"];

export type ConnectionStatus = "connected" | "needs-professional" | "not-connected" | "expired";

export interface Platform {
  id: PlatformId;
  name: string;
  /** Account name or handle on that platform. */
  account: string;
  status: ConnectionStatus;
  followers: number;
  /** Followers gained in each range. */
  followerGrowth: Record<Range, number>;
  /** Engagement rate, percent, last 30 days. */
  engagement: number;
  views30: number;
  posts30: number;
  /** Daily follower totals for the last 31 days, oldest first. */
  trend: number[];
  /** What the platform calls its followers. */
  followerNoun: string;
}

export interface Metrics {
  followers: number;
  followerDelta: number;
  views: number;
  /** Percent change in views vs. the previous period. */
  viewsChange: number;
  engagement: number;
  /** Change in engagement rate, percentage points. */
  engagementChange: number;
  posts: number;
}

export interface Overview {
  accountName: string;
  connectedCount: number;
  metrics: Record<Range, Metrics>;
  weekGrowth: { day: string; value: number }[];
  topPlatform: PlatformId;
  /** Daily total followers for the last 31 days. */
  trend: number[];
  /** First day of `trend`, ISO date. */
  trendStart: string;
}

/** Views per day across all platforms, this week vs last week (Mon–Sun). */
export interface DailyViews {
  days: string[];
  thisWeek: number[];
  lastWeek: number[];
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
  insight?: string;
}

export type PostSort = "views" | "engagement" | "date";

export interface Audience {
  /** Platforms whose demographics are included (not every platform shares them). */
  sources: PlatformId[];
  ages: { label: string; share: number }[];
  countries: { name: string; share: number }[];
  slotLabels: string[];
  bestTimes: { day: string; slots: number[] }[];
}
