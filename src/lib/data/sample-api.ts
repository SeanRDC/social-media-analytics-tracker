/**
 * Sample data behind the same functions as `api.ts`: the landing page's
 * preview, and fixtures for tests.
 */
import { sortPosts } from "./sort";
import { ACCOUNT_NAME, AUDIENCE, TODAY, DAILY_VIEWS, METRICS, PLATFORMS, POSTS, TOTAL_TREND, TREND_START, WEEK_GROWTH, platformById } from "./sample";
import type { Audience, DailyViews, Overview, Platform, Post, PostQuery } from "./types";

/** The date the numbers are current as of (ISO). */
export async function getAsOf(): Promise<string> {
  return TODAY;
}

export async function getOverview(): Promise<Overview> {
  const connected = PLATFORMS.filter((p) => p.status === "connected");
  const top = [...connected].sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0))[0];
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

export async function getPosts(q: PostQuery = {}): Promise<Post[]> {
  const list = POSTS.filter((p) => (!q.platform || p.platform === q.platform) && (!q.kind || p.kind === q.kind));
  return sortPosts(list, q.sort ?? "views");
}

export async function getAudience(): Promise<Audience> {
  return AUDIENCE;
}
