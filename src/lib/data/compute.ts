/**
 * Turns stored rows into the data contract the UI already renders. Pure:
 * no database, no clock (everything is relative to the latest stored day), so
 * every rule can be tested directly.
 */
import { addDays, dateRange, isoDate, weekdayShort } from "@/lib/dates";
import { PLATFORM_NAMES } from "@/lib/platforms";
import type { Audience, ConnectionStatus, DailyViews, Metrics, Overview, Platform, PlatformId, Post, PostKind, Range } from "./types";
import { PLATFORM_ORDER, RANGES } from "./types";

/** One day as the platform reported it; null = not reported that day. */
export interface DayRow {
  date: string;
  followers: number | null;
  followersGained: number | null;
  views: number | null;
  engagements: number | null;
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
const known = <T>(xs: (T | null)[]) => xs.filter((x): x is T => x !== null);
/** Sum of the reported values, or null when none were reported. */
const sumKnown = (xs: (number | null)[]) => {
  const k = known(xs);
  return k.length ? sum(k) : null;
};
const round1 = (x: number) => Math.round(x * 10) / 10;
/** Engagement rate, percent, one decimal. */
const rate = (engagements: number, views: number) => (views > 0 ? round1((engagements / views) * 100) : 0);
/** Engagement rate over the days that reported both views and engagement; null if none did. */
const rateOf = (days: DayRow[]) => {
  const both = days.filter((d) => d.views !== null && d.engagements !== null);
  return both.length ? rate(sum(both.map((d) => d.engagements!)), sum(both.map((d) => d.views!))) : null;
};
/** Whether every day reported views and engagement (needed for a fair period-over-period change). */
const complete = (days: DayRow[]) => days.every((d) => d.views !== null && d.engagements !== null);
/** First day that reported views, when later than the first day of the period. */
const firstReported = (days: DayRow[]) => {
  const first = days.find((d) => d.views !== null)?.date ?? null;
  return first && first > days[0].date ? first : null;
};

/** The latest stored day across all connections (platforms report with a lag). */
export function asOfDate(ds: Dataset): string | null {
  let latest: string | null = null;
  for (const c of ds.connections) for (const d of c.daily) if (!latest || d.date > latest) latest = d.date;
  return latest;
}

/** The `n` days ending `asOf` for one connection; days the platform did not report are all null. */
export function daysEnding(c: ConnectionData, asOf: string, n: number): DayRow[] {
  const byDate = new Map(c.daily.map((d) => [d.date, d]));
  return dateRange(addDays(asOf, -(n - 1)), asOf).map((date) => byDate.get(date) ?? { date, followers: null, followersGained: null, views: null, engagements: null });
}

/** The latest follower total the platform reported on or before `asOf`. */
export function latestFollowers(c: ConnectionData, asOf: string): number | null {
  for (let i = c.daily.length - 1; i >= 0; i--) if (c.daily[i].date <= asOf && c.daily[i].followers !== null) return c.daily[i].followers;
  return null;
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
    if (!c) return { ...base, account: "", status: "not-connected", followers: null, followerGrowth: { 7: null, 30: null, 90: null }, engagement: null, views30: null, dataSince: null, posts30: 0, postViews: 0, postCount: 0, viewsPerPost30: null, trend: [] };
    const days90 = daysEnding(c, asOf, 90);
    const last = (n: number) => days90.slice(-n);
    const growth = (r: Range) => sumKnown(last(r).map((d) => d.followersGained));
    const d30 = last(30);
    const mine = ds.posts.filter((p) => p.platform === id);
    const recent = postsBetween(mine, addDays(asOf, -29), asOf);
    return {
      ...base,
      account: c.account,
      status: c.status,
      followers: latestFollowers(c, asOf),
      followerGrowth: { 7: growth(7), 30: growth(30), 90: growth(90) },
      engagement: rateOf(d30),
      views30: sumKnown(d30.map((d) => d.views)),
      dataSince: firstReported(d30),
      posts30: recent.length,
      postViews: sum(mine.map((p) => p.views)),
      postCount: mine.length,
      viewsPerPost30: recent.length ? Math.round(sum(recent.map((p) => p.views)) / recent.length) : null,
      trend: last(31).map((d) => d.followers),
    };
  });
}

/** The latest day, at most a week before `asOf`, on which every connection reported views. */
function lastCompleteDay(conns: ConnectionData[], asOf: string, r: Range): string | null {
  if (!conns.length) return null;
  for (let back = 0; back < Math.min(7, r); back++) {
    const day = addDays(asOf, -back);
    if (conns.every((c) => c.daily.some((d) => d.date === day && d.views !== null))) return day;
  }
  return null;
}

function metrics(ds: Dataset, asOf: string, r: Range): Metrics {
  const conns = live(ds);
  const days = conns.map((c) => daysEnding(c, asOf, r * 2));
  const cur = days.flatMap((d) => d.slice(r));
  const views = sumKnown(cur.map((d) => d.views));
  const engagement = rateOf(cur);
  // The change compares two fully reported periods. Platforms report with a lag
  // (YouTube a day or two), so both periods end on the latest day every platform
  // has reported, rather than on a day some have not reported yet.
  const end = lastCompleteDay(conns, asOf, r);
  const both = end ? conns.map((c) => daysEnding(c, end, r * 2)) : [];
  const curFull = both.flatMap((d) => d.slice(r));
  const prevFull = both.flatMap((d) => d.slice(0, r));
  const comparable = end !== null && complete(curFull) && complete(prevFull);
  const nowViews = sumKnown(curFull.map((d) => d.views));
  const prevViews = sumKnown(prevFull.map((d) => d.views));
  const nowEngagement = rateOf(curFull);
  const prevEngagement = rateOf(prevFull);
  const changeable = comparable && prevViews !== null && prevViews > 0;
  const followers = known(conns.map((c) => latestFollowers(c, asOf)));
  const platforms = new Set(conns.map((c) => c.platform));
  return {
    followers: followers.length ? sum(followers) : null,
    followerDelta: sumKnown(cur.map((d) => d.followersGained)),
    views,
    viewsChange: changeable ? Math.round((nowViews! / prevViews! - 1) * 100) : null,
    engagement,
    engagementChange: changeable ? round1(nowEngagement! - prevEngagement!) : null,
    dataSince: known(days.map((d) => firstReported(d.slice(r)))).sort().at(-1) ?? null,
    comparable,
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
  const top = [...shown].sort((a, b) => (b.followers ?? -1) - (a.followers ?? -1))[0];
  const last7 = live(ds).map((c) => daysEnding(c, asOf, 7));
  return {
    accountName: top?.account || "Your accounts",
    connectedCount: shown.length,
    metrics: Object.fromEntries(RANGES.map((r) => [r, metrics(ds, asOf, r)])) as Record<Range, Metrics>,
    weekGrowth: dateRange(addDays(asOf, -6), asOf).map((date, i) => ({ day: weekdayShort(date), value: sumKnown(last7.map((d) => d[i].followersGained)) })),
    topPlatform: top?.id ?? "youtube",
    // a day's total is only known when every platform reported its followers that day
    trend: Array.from({ length: 31 }, (_, i) => {
      const xs = shown.map((p) => p.trend[i] ?? null);
      return xs.length && xs.every((x) => x !== null) ? sum(xs as number[]) : null;
    }),
    trendStart: addDays(asOf, -30),
  };
}

/** The last 7 stored days against the 7 before them. */
export function computeDailyViews(ds: Dataset, asOf: string): DailyViews {
  const days = live(ds).map((c) => daysEnding(c, asOf, 14));
  const total = (i: number) => sumKnown(days.map((d) => d[i].views));
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
  const followers = new Map(conns.map((c) => [c.platform, latestFollowers(c, asOf) || 1]));
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
