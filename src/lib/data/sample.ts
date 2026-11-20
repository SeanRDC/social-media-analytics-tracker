/**
 * Sample data for the front-end phase. Numbers are internally consistent so the
 * UI can be checked end to end. The backend phase replaces this module's role
 * behind `api.ts`.
 */
import type { Audience, DailyViews, Metrics, Platform, PlatformId, Post, Range } from "./types";

export const ACCOUNT_NAME = "Northbay Studio";
export const TODAY = "2026-11-15";
export const TREND_START = "2026-10-16";

/** Smooth, deterministic 31-day series from `start` to `end` with a little texture. */
function series(start: number, end: number, seed: number): number[] {
  const out: number[] = [];
  const gain = end - start;
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    let v = start + gain * Math.pow(t, 1.15);
    if (i > 0 && i < 30) v += gain * 0.035 * Math.sin(i * 1.3 + seed);
    out.push(Math.round(v));
  }
  return out;
}

/** Sample numbers are complete by construction: every day is "reported". */
type PlatformSeed = Omit<Platform, "trend" | "dataSince" | "followers" | "followerGrowth" | "engagement" | "views30" | "postViews" | "postCount" | "viewsPerPost30"> & {
  followers: number;
  followerGrowth: Record<Range, number>;
  engagement: number;
  views30: number;
};

const PLATFORM_SEEDS: PlatformSeed[] = [
  { id: "youtube", name: "YouTube", account: "Northbay Studio", status: "connected", followers: 112_400, followerGrowth: { 7: 1_200, 30: 4_100, 90: 10_200 }, engagement: 5.1, views30: 684_000, posts30: 6, followerNoun: "subscribers" },
  { id: "facebook", name: "Facebook", account: "Northbay Studio Page", status: "connected", followers: 21_700, followerGrowth: { 7: 150, 30: 500, 90: 1_100 }, engagement: 2.3, views30: 290_000, posts30: 6, followerNoun: "followers" },
  { id: "tiktok", name: "TikTok", account: "@northbay.studio", status: "connected", followers: 46_900, followerGrowth: { 7: 650, 30: 2_600, 90: 6_500 }, engagement: 8.9, views30: 2_600_000, posts30: 14, followerNoun: "followers" },
  { id: "linkedin", name: "LinkedIn", account: "Northbay Studio", status: "connected", followers: 9_400, followerGrowth: { 7: 100, 30: 300, 90: 700 }, engagement: 3.0, views30: 76_000, posts30: 4, followerNoun: "followers" },
  { id: "instagram", name: "Instagram", account: "@northbay.studio", status: "connected", followers: 58_200, followerGrowth: { 7: 600, 30: 2_300, 90: 5_600 }, engagement: 6.4, views30: 1_250_000, posts30: 12, followerNoun: "followers" },
  { id: "x", name: "X", account: "", status: "not-connected", followers: 0, followerGrowth: { 7: 0, 30: 0, 90: 0 }, engagement: 0, views30: 0, posts30: 0, followerNoun: "followers" },
];

export const PLATFORMS: Platform[] = PLATFORM_SEEDS.map((p, i) => ({
  ...p,
  dataSince: null,
  // sample posts: a month of views spread over the month's posts
  postViews: p.views30,
  postCount: p.posts30,
  viewsPerPost30: p.posts30 ? Math.round(p.views30 / p.posts30) : null,
  trend: p.status === "connected" ? series(p.followers - p.followerGrowth[30], p.followers, i) : [],
}));

const connected = PLATFORM_SEEDS.filter((p) => p.status === "connected");
const totalFollowers = connected.reduce((s, p) => s + p.followers, 0);
const growth = (r: Range) => PLATFORM_SEEDS.reduce((s, p) => s + p.followerGrowth[r], 0);
const trendOf = (id: string) => PLATFORMS.find((p) => p.id === id)!.trend;

export const METRICS: Record<Range, Metrics> = {
  7: { followers: totalFollowers, followerDelta: growth(7), views: 1_200_000, viewsChange: 8, engagement: 6.0, engagementChange: 0.3, posts: 11, dataSince: null, comparable: true },
  30: { followers: totalFollowers, followerDelta: growth(30), views: 4_900_000, viewsChange: 12, engagement: 5.8, engagementChange: 0.4, posts: 42, dataSince: null, comparable: true },
  90: { followers: totalFollowers, followerDelta: growth(90), views: 13_800_000, viewsChange: 21, engagement: 5.5, engagementChange: -0.1, posts: 118, dataSince: null, comparable: true },
};

export const WEEK_GROWTH = [
  { day: "Mon", value: 310 },
  { day: "Tue", value: 280 },
  { day: "Wed", value: 420 },
  { day: "Thu", value: 360 },
  { day: "Fri", value: 390 },
  { day: "Sat", value: 470 },
  { day: "Sun", value: 470 },
];

export const TOTAL_TREND: number[] = Array.from({ length: 31 }, (_, i) =>
  connected.reduce((s, p) => s + (trendOf(p.id)[i] ?? 0), 0),
);

/** Mon Nov 9 – Sun Nov 15 vs the week before. This week sums to the 7-day views (1.2M, +8%). */
const THIS_WEEK = [148_000, 132_000, 171_000, 158_000, 166_000, 214_000, 211_000];
const views30Total = connected.reduce((s, p) => s + p.views30, 0);

/** Each day's total split by the platforms' 30-day view shares, with a little texture; the last platform takes the remainder so days still add up. */
function splitByPlatform(): DailyViews["byPlatform"] {
  const rows = connected.map((p, k) => ({
    platform: p.id,
    thisWeek: THIS_WEEK.map((t, i) => Math.round((t * p.views30 * (1 + 0.12 * Math.sin(i * 1.7 + k))) / views30Total)),
  }));
  const last = rows[rows.length - 1].thisWeek;
  THIS_WEEK.forEach((t, i) => {
    last[i] = t - rows.slice(0, -1).reduce((s, r) => s + r.thisWeek[i], 0);
  });
  return rows;
}

export const DAILY_VIEWS: DailyViews = {
  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  thisWeek: THIS_WEEK,
  lastWeek: [139_000, 121_000, 158_000, 149_000, 151_000, 188_000, 205_000],
  byPlatform: splitByPlatform(),
  todayIndex: 6,
};

type PostSeed = Omit<Post, "likes" | "comments" | "shares">;

const POST_SEEDS: PostSeed[] = [
  { id: "p01", title: "Studio tour in 30 seconds", platform: "tiktok", kind: "video", publishedAt: "2026-11-11", views: 284_000, engagement: 9.4, avgWatchSeconds: 24, thumb: "a", insight: "2.3× your usual views. Most viewers watched to the end, and half found it on the For You page." },
  { id: "p02", title: "How we light product shots", platform: "youtube", kind: "video", publishedAt: "2026-11-08", views: 96_300, engagement: 6.1, avgWatchSeconds: 372, thumb: "b", insight: "Your longest average watch time this month. Viewers rewatched the softbox section most." },
  { id: "p03", title: "Before and after: kitchen set", platform: "instagram", kind: "reel", publishedAt: "2026-11-13", views: 71_800, engagement: 7.2, avgWatchSeconds: 31, thumb: "c", insight: "Saved 1.9× more than your average reel." },
  { id: "p04", title: "Desk setup tour", platform: "tiktok", kind: "video", publishedAt: "2026-11-06", views: 62_400, engagement: 8.1, avgWatchSeconds: 19, thumb: "d" },
  { id: "p05", title: "Lighting a small room", platform: "tiktok", kind: "video", publishedAt: "2026-10-29", views: 58_300, engagement: 9.0, avgWatchSeconds: 22, thumb: "a" },
  { id: "p06", title: "3 lenses we always pack", platform: "youtube", kind: "short", publishedAt: "2026-11-12", views: 54_200, engagement: 5.5, avgWatchSeconds: 41, thumb: "b" },
  { id: "p07", title: "Golden hour on the pier", platform: "instagram", kind: "reel", publishedAt: "2026-11-10", views: 48_900, engagement: 6.8, avgWatchSeconds: 14, thumb: "c" },
  { id: "p08", title: "Editing a client reel live", platform: "youtube", kind: "video", publishedAt: "2026-11-03", views: 38_700, engagement: 4.8, avgWatchSeconds: 525, thumb: "d" },
  { id: "p09", title: "Our 2026 studio setup", platform: "youtube", kind: "video", publishedAt: "2026-10-27", views: 31_000, engagement: 4.6, avgWatchSeconds: 610, thumb: "a" },
  { id: "p10", title: "Behind the scenes: brand shoot", platform: "facebook", kind: "video", publishedAt: "2026-11-02", views: 21_400, engagement: 2.6, avgWatchSeconds: 48, thumb: "b" },
  { id: "p11", title: "We're hiring a second editor", platform: "facebook", kind: "post", publishedAt: "2026-11-06", views: 12_900, engagement: 2.1, avgWatchSeconds: null, thumb: "c" },
  { id: "p12", title: "What clients ask before a shoot", platform: "linkedin", kind: "post", publishedAt: "2026-11-09", views: 8_200, engagement: 3.4, avgWatchSeconds: null, thumb: "d" },
];

export const POSTS: Post[] = POST_SEEDS.map((p) => {
  const engagements = (p.views * p.engagement) / 100;
  return {
    ...p,
    likes: Math.round(engagements * 0.8),
    comments: Math.round(engagements * 0.12),
    shares: Math.round(engagements * 0.08),
  };
});

export const AUDIENCE: Audience = {
  sources: ["youtube", "instagram"],
  ages: [
    { label: "13–17", share: 4 },
    { label: "18–24", share: 31 },
    { label: "25–34", share: 38 },
    { label: "35–44", share: 17 },
    { label: "45+", share: 10 },
  ],
  countries: [
    { name: "United States", share: 34 },
    { name: "Philippines", share: 18 },
    { name: "United Kingdom", share: 11 },
    { name: "Canada", share: 8 },
    { name: "Australia", share: 6 },
    { name: "Other", share: 23 },
  ],
  slotLabels: ["9 a.m.", "1 p.m.", "6 p.m.", "10 p.m."],
  bestTimes: [
    { day: "Mon", slots: [0.2, 0.35, 0.6, 0.4] },
    { day: "Tue", slots: [0.25, 0.4, 0.7, 0.45] },
    { day: "Wed", slots: [0.2, 0.35, 0.65, 0.4] },
    { day: "Thu", slots: [0.3, 0.45, 1, 0.55] },
    { day: "Fri", slots: [0.25, 0.4, 0.8, 0.6] },
    { day: "Sat", slots: [0.45, 0.7, 0.6, 0.35] },
    { day: "Sun", slots: [0.5, 0.75, 0.55, 0.3] },
  ],
};

export function platformById(id: string): Platform | undefined {
  return PLATFORMS.find((p) => p.id === (id as PlatformId));
}
