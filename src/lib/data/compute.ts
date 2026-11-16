/**
 * Turns stored rows into the data contract the UI already renders. Pure:
 * no database, no clock (everything is relative to the latest stored day), so
 * every rule can be tested directly.
 */
import { addDays, dateRange, isoDate, weekdayShort } from "@/lib/dates";
import { PLATFORM_NAMES } from "@/lib/platforms";
import type { Audience, ConnectionStatus, DailyViews, Metrics, Overview, Platform, PlatformId, Post, PostKind, Range } from "./types";
import { PLATFORM_ORDER, RANGES } from "./types";

export interface DayRow {
  date: string;
  followers: number;
  followersGained: number;
  views: number;
  engagements: number;
}

export interface ConnectionData {
  platform: PlatformId;
  account: string;
  status: ConnectionStatus;
  /** Oldest first. */
  daily: DayRow[];
}

export interface PostData {
  id: string;
  platform: PlatformId;
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

export interface AudienceData {
  platform: PlatformId;
  dimension: "age" | "country" | "gender";
  key: string;
  share: number;
}

export interface Dataset {
  connections: ConnectionData[];
  posts: PostData[];
  audience: AudienceData[];
}

const NOUN: Partial<Record<PlatformId, string>> = { youtube: "subscribers" };
const AGE_ORDER = ["13–17", "18–24", "25–34", "35–44", "45+"];
const SLOT_LABELS = ["9 a.m.", "1 p.m.", "6 p.m.", "10 p.m."];
const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const THUMBS = ["a", "b", "c", "d"] as const;

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const round1 = (x: number) => Math.round(x * 10) / 10;
/** Engagement rate, percent, one decimal. */
const rate = (engagements: number, views: number) => (views > 0 ? round1((engagements / views) * 100) : 0);

/** The latest stored day across all connections (platforms report with a lag). */
export function asOfDate(ds: Dataset): string | null {
  let latest: string | null = null;
  for (const c of ds.connections) for (const d of c.daily) if (!latest || d.date > latest) latest = d.date;
  return latest;
}

/**
 * The `n` days ending `asOf` for one connection. Missing days carry the
 * follower total forward (or back) and count nothing else.
 */
export function daysEnding(c: ConnectionData, asOf: string, n: number): DayRow[] {
  const byDate = new Map(c.daily.map((d) => [d.date, d]));
  const dates = dateRange(addDays(asOf, -(n - 1)), asOf);
  let carry = [...c.daily].reverse().find((d) => d.date < dates[0])?.followers ?? c.daily.find((d) => d.date >= dates[0])?.followers ?? 0;
  return dates.map((date) => {
    const hit = byDate.get(date);
    if (hit) carry = hit.followers;
    return hit ?? { date, followers: carry, followersGained: 0, views: 0, engagements: 0 };
  });
}

const live = (ds: Dataset) => ds.connections.filter((c) => c.status === "connected" && c.daily.length > 0);

function postsBetween(posts: PostData[], start: string, end: string) {
  return posts.filter((p) => {
    const d = isoDate(p.publishedAt);
    return d >= start && d <= end;
  });
}

export function computePlatforms(ds: Dataset, asOf: string): Platform[] {
  return PLATFORM_ORDER.map((id) => {
    const c = ds.connections.find((x) => x.platform === id);
    const base = { id, name: PLATFORM_NAMES[id], followerNoun: NOUN[id] ?? "followers" };
    if (!c) return { ...base, account: "", status: "not-connected", followers: 0, followerGrowth: { 7: 0, 30: 0, 90: 0 }, engagement: 0, views30: 0, posts30: 0, trend: [] };
    const days90 = daysEnding(c, asOf, 90);
    const last = (n: number) => days90.slice(-n);
    const growth = (r: Range) => sum(last(r).map((d) => d.followersGained));
    const d30 = last(30);
    return {
      ...base,
      account: c.account,
      status: c.status,
      followers: days90.at(-1)!.followers,
      followerGrowth: { 7: growth(7), 30: growth(30), 90: growth(90) },
      engagement: rate(sum(d30.map((d) => d.engagements)), sum(d30.map((d) => d.views))),
      views30: sum(d30.map((d) => d.views)),
      posts30: postsBetween(ds.posts.filter((p) => p.platform === id), addDays(asOf, -29), asOf).length,
      trend: last(31).map((d) => d.followers),
    };
  });
}

function metrics(ds: Dataset, asOf: string, r: Range): Metrics {
  const conns = live(ds);
  const days = conns.map((c) => daysEnding(c, asOf, r * 2));
  const cur = days.flatMap((d) => d.slice(r));
  const prev = days.flatMap((d) => d.slice(0, r));
  const views = sum(cur.map((d) => d.views));
  const prevViews = sum(prev.map((d) => d.views));
  const engagement = rate(sum(cur.map((d) => d.engagements)), views);
  const prevEngagement = rate(sum(prev.map((d) => d.engagements)), prevViews);
  const platforms = new Set(conns.map((c) => c.platform));
  return {
    followers: sum(days.map((d) => d.at(-1)!.followers)),
    followerDelta: sum(cur.map((d) => d.followersGained)),
    views,
    viewsChange: prevViews > 0 ? Math.round((views / prevViews - 1) * 100) : 0,
    engagement,
    engagementChange: prevViews > 0 ? round1(engagement - prevEngagement) : 0,
    posts: postsBetween(
      ds.posts.filter((p) => platforms.has(p.platform)),
      addDays(asOf, -(r - 1)),
      asOf,
    ).length,
  };
}

export function computeOverview(ds: Dataset, asOf: string): Overview {
  const platforms = computePlatforms(ds, asOf);
  const shown = platforms.filter((p) => live(ds).some((c) => c.platform === p.id));
  const top = [...shown].sort((a, b) => b.followers - a.followers)[0];
  const last7 = live(ds).map((c) => daysEnding(c, asOf, 7));
  return {
    accountName: top?.account || "Your accounts",
    connectedCount: shown.length,
    metrics: Object.fromEntries(RANGES.map((r) => [r, metrics(ds, asOf, r)])) as Record<Range, Metrics>,
    weekGrowth: dateRange(addDays(asOf, -6), asOf).map((date, i) => ({ day: weekdayShort(date), value: sum(last7.map((d) => d[i].followersGained)) })),
    topPlatform: top?.id ?? "youtube",
    trend: Array.from({ length: 31 }, (_, i) => sum(shown.map((p) => p.trend[i] ?? 0))),
    trendStart: addDays(asOf, -30),
  };
}

/** The last 7 stored days against the 7 before them. */
export function computeDailyViews(ds: Dataset, asOf: string): DailyViews {
  const days = live(ds).map((c) => daysEnding(c, asOf, 14));
  const total = (i: number) => sum(days.map((d) => d[i].views));
  const dates = dateRange(addDays(asOf, -6), asOf);
  return {
    days: dates.map(weekdayShort),
    thisWeek: dates.map((_, i) => total(i + 7)),
    lastWeek: dates.map((_, i) => total(i)),
    todayIndex: 6,
  };
}

export function computePosts(ds: Dataset): Post[] {
  return ds.posts.map((p, i) => ({
    id: p.id,
    title: p.title,
    platform: p.platform,
    kind: p.kind,
    publishedAt: isoDate(p.publishedAt),
    views: p.views,
    engagement: rate(p.likes + p.comments + p.shares, p.views),
    avgWatchSeconds: p.avgWatchSeconds,
    likes: p.likes,
    comments: p.comments,
    shares: p.shares,
    thumb: THUMBS[i % THUMBS.length],
    ...(p.thumbnailUrl ? { thumbnailUrl: p.thumbnailUrl } : {}),
    ...(p.permalink ? { permalink: p.permalink } : {}),
  }));
}

/** Rounds shares to whole percents that add up to exactly 100 (largest remainder). */
export function roundTo100(values: number[]): number[] {
  const total = sum(values);
  if (total <= 0) return values.map(() => 0);
  const exact = values.map((v) => (v / total) * 100);
  const out = exact.map(Math.floor);
  const order = exact.map((v, i) => ({ i, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r);
  for (let k = 0; k < 100 - sum(out); k++) out[order[k % order.length].i]++;
  return out;
}

const regionName = (() => {
  let names: Intl.DisplayNames | null = null;
  return (code: string) => {
    try {
      names ??= new Intl.DisplayNames(["en"], { type: "region" });
      return names.of(code.toUpperCase()) ?? code;
    } catch {
      return code;
    }
  };
})();

export function computeAudience(ds: Dataset, asOf: string): Audience {
  const conns = live(ds);
  const followers = new Map(conns.map((c) => [c.platform, daysEnding(c, asOf, 1)[0].followers || 1]));
  const rows = ds.audience.filter((a) => followers.has(a.platform));
  const sources = PLATFORM_ORDER.filter((id) => rows.some((r) => r.platform === id));

  /** Shares combined across platforms, weighted by each platform's followers. */
  const weighted = (dimension: AudienceData["dimension"]) => {
    const totals = new Map<string, number>();
    for (const r of rows.filter((x) => x.dimension === dimension)) totals.set(r.key, (totals.get(r.key) ?? 0) + r.share * followers.get(r.platform)!);
    const weight = sum(sources.filter((id) => rows.some((r) => r.platform === id && r.dimension === dimension)).map((id) => followers.get(id)!));
    return new Map([...totals].map(([k, v]) => [k, weight ? v / weight : 0]));
  };

  const age = weighted("age");
  const ageLabels = AGE_ORDER.filter((l) => age.has(l));
  const ageShares = roundTo100(ageLabels.map((l) => age.get(l)!));

  const country = [...weighted("country")].sort((a, b) => b[1] - a[1]);
  const top = country.slice(0, 5);
  const other = Math.max(0, 100 - sum(top.map(([, v]) => v)));
  const countryShares = roundTo100([...top.map(([, v]) => v), other]);
  const countries = top.length ? [...top.map(([code], i) => ({ name: regionName(code), share: countryShares[i] })), ...(countryShares[5] > 0 ? [{ name: "Other", share: countryShares[5] }] : [])] : [];

  return {
    sources,
    ages: ageLabels.map((label, i) => ({ label, share: ageShares[i] })),
    countries,
    slotLabels: SLOT_LABELS,
    bestTimes: bestTimes(ds.posts.filter((p) => followers.has(p.platform))),
  };
}

/** Morning 5–11, midday 11–16, evening 16–20, night 20–5 (UTC). */
const slotOf = (hour: number) => (hour >= 5 && hour < 11 ? 0 : hour >= 11 && hour < 16 ? 1 : hour >= 16 && hour < 20 ? 2 : 3);

/** Average views by weekday and time slot, scaled so the best cell is 1. */
export function bestTimes(posts: PostData[]): Audience["bestTimes"] {
  const cells = WEEK.map(() => SLOT_LABELS.map(() => ({ views: 0, n: 0 })));
  for (const p of posts) {
    const day = (p.publishedAt.getUTCDay() + 6) % 7;
    const cell = cells[day][slotOf(p.publishedAt.getUTCHours())];
    cell.views += p.views;
    cell.n++;
  }
  const avg = cells.map((row) => row.map((c) => (c.n ? c.views / c.n : 0)));
  const max = Math.max(...avg.flat());
  return WEEK.map((day, d) => ({ day, slots: avg[d].map((v) => (max > 0 ? Math.round((v / max) * 100) / 100 : 0)) }));
}
