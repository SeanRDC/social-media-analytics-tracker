import type { PostKind } from "@/lib/data/types";

/** One day of account totals. `followers` is the total at the end of that day. */
export interface DailyRow {
  date: string;
  followers: number;
  followersGained: number;
  views: number;
  engagements: number;
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
}

export interface SyncWindow {
  start: string;
  end: string;
}
