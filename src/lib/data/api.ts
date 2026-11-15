/**
 * The data layer the UI depends on. Every function is async so the backend
 * phase can replace these bodies with real requests without touching pages.
 */
import { sortPosts } from "./sort";
import { ACCOUNT_NAME, AUDIENCE, TODAY, DAILY_VIEWS, METRICS, PLATFORMS, POSTS, TOTAL_TREND, TREND_START, WEEK_GROWTH, platformById } from "./sample";
import type { Audience, DailyViews, Overview, Platform, PlatformId, Post, PostKind, PostSort } from "./types";

export async function getAccount(): Promise<{ name: string; email: string }> {
  return { name: ACCOUNT_NAME, email: "hello@northbay.studio" };
}

/** The date the numbers are current as of (ISO). */
export async function getAsOf(): Promise<string> {
  return TODAY;
}

export async function getOverview(): Promise<Overview> {
  const connected = PLATFORMS.filter((p) => p.status === "connected");
  const top = [...connected].sort((a, b) => b.followers - a.followers)[0];
  return {
    accountName: ACCOUNT_NAME,
    connectedCount: connected.length,
    metrics: METRICS,
    weekGrowth: WEEK_GROWTH,
    topPlatform: top.id,
    trend: TOTAL_TREND,
    trendStart: TREND_START,
  };
}

export async function getDailyViews(): Promise<DailyViews> {
  return DAILY_VIEWS;
}

export async function getPlatforms(): Promise<Platform[]> {
  return PLATFORMS;
}

export async function getPlatform(id: string): Promise<Platform | null> {
  return platformById(id) ?? null;
}

export async function getConnections(): Promise<Pick<Platform, "id" | "name" | "account" | "status">[]> {
  return PLATFORMS.map(({ id, name, account, status }) => ({ id, name, account, status }));
}

export interface PostQuery {
  platform?: PlatformId;
  kind?: PostKind;
  sort?: PostSort;
}

export async function getPosts(q: PostQuery = {}): Promise<Post[]> {
  const list = POSTS.filter((p) => (!q.platform || p.platform === q.platform) && (!q.kind || p.kind === q.kind));
  return sortPosts(list, q.sort ?? "views");
}

export async function getTopPosts(limit = 5): Promise<Post[]> {
  return sortPosts(POSTS, "views").slice(0, limit);
}

export async function getAudience(): Promise<Audience> {
  return AUDIENCE;
}
