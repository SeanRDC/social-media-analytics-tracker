/**
 * Turns stored rows into the data contract the UI already renders. Pure:
 * no database, no clock (everything is relative to the latest stored day), so
 * every rule can be tested directly.
 */
import { addDays, DAY_MS, dateRange, isoDate, weekdayShort } from "@/lib/dates";
import { PLATFORM_NAMES } from "@/lib/platforms";
import type { Audience, ConnectionStatus, DailyViews, Metrics, OnlineTimes, Overview, Platform, PlatformId, Post, PostingCell, PostingTimes, PostKind, Range, TimeSlot } from "./types";
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
  /**
   * Lifetime views as read closest to exactly FIRST_WEEK_DAYS after publishing
   * (within half a day); null when no reading was taken then, e.g. the post was
   * imported later.
   */
  views7d: number | null;
  /** views7d is still to come from the platform (a later sync reads it), so a null means "waiting", not "missing". */
  firstWeekPending?: boolean;
}

/** Followers online in one hour, as the platform reported it. */
export interface OnlineHour {
  platform: PlatformId;
  hourStart: Date;
  followers: number;
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
  /** Hourly "followers online" (Instagram only shares it). */
  online?: OnlineHour[];
}

const NOUN: Partial<Record<PlatformId, string>> = { youtube: "subscribers" };
const AGE_ORDER = ["13–17", "18–24", "25–34", "35–44", "45+"];
/** Windows of the day, in the person's own time. Night runs past midnight and belongs to the day it started. */
const SLOTS: TimeSlot[] = [
  { label: "Morning", hours: "5–11 a.m." },
  { label: "Midday", hours: "11 a.m.–4 p.m." },
  { label: "Evening", hours: "4–8 p.m." },
  { label: "Night", hours: "8 p.m.–5 a.m." },
];
/** Posts are compared by their views this many days after publishing. */
export const FIRST_WEEK_DAYS = 7;
/** Days after the first week before a missing first-week number counts as missing rather than pending. */
const FIRST_WEEK_SETTLE_DAYS = 4;
/** Posts a cell, day or window needs before it is scored: one post can't speak for a slot. */
export const MIN_POSTS = 3;
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
  const conns = live(ds);
  const days = conns.map((c) => daysEnding(c, asOf, 14));
  const total = (i: number) => sumKnown(days.map((d) => d[i].views));
  const dates = dateRange(addDays(asOf, -6), asOf);
  return {
    days: dates.map(weekdayShort),
    thisWeek: dates.map((_, i) => total(i + 7)),
    lastWeek: dates.map((_, i) => total(i)),
    byPlatform: PLATFORM_ORDER.flatMap((id) => {
      const k = conns.findIndex((c) => c.platform === id);
      return k < 0 ? [] : [{ platform: id, thisWeek: dates.map((_, i) => days[k][i + 7].views) }];
    }),
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

export function computeAudience(ds: Dataset, asOf: string, timeZone = "UTC"): Audience {
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
    slots: SLOTS,
    posting: postingTimes(ds.posts.filter((p) => followers.has(p.platform)), asOf, timeZone),
    online: onlineTimes((ds.online ?? []).filter((h) => followers.has(h.platform)), timeZone),
    minPosts: MIN_POSTS,
    firstWeekDays: FIRST_WEEK_DAYS,
    timeZone,
  };
}

/** A moment's weekday (0 = Monday) and hour in a time zone. */
function localDayHour(timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "numeric", hourCycle: "h23" });
  return (d: Date) => {
    const parts = fmt.formatToParts(d);
    const weekday = parts.find((p) => p.type === "weekday")!.value;
    return { day: WEEK.indexOf(weekday), hour: Number(parts.find((p) => p.type === "hour")!.value) };
  };
}

/**
 * Which weekday and window a moment falls in, in the person's time zone:
 * morning 5–11, midday 11–16, evening 16–20, night 20–5. The small hours
 * belong to the night that started the evening before (1 a.m. Tuesday is
 * Monday night).
 */
export function placeInWeek(timeZone: string) {
  const local = localDayHour(timeZone);
  return (d: Date) => {
    const { day, hour } = local(d);
    if (hour < 5) return { day: (day + 6) % 7, slot: 3 };
    return { day, slot: hour < 11 ? 0 : hour < 16 ? 1 : hour < 20 ? 2 : 3 };
  };
}

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** A group of posts' scores as one cell: their median, once there are enough of them. */
const cellOf = (scores: number[]): PostingCell => ({ score: scores.length >= MIN_POSTS ? Math.round(median(scores) * 100) / 100 : null, posts: scores.length });

/**
 * When past posts did best, by weekday and window of the day in the person's
 * time zone. Fair by construction:
 * - every post is measured at the same age, its views FIRST_WEEK_DAYS after
 *   publishing, so old posts don't win just by having had longer;
 * - each post is scored against its own platform's typical (median) post, so
 *   a big platform doesn't drown out a small one;
 * - a cell is the median of its posts, so one viral post can't carry it, and
 *   it only gets a score with MIN_POSTS or more.
 * Posts too young to have a week's numbers, or imported after their first week,
 * are counted separately and left out.
 */
export function postingTimes(posts: PostData[], asOf: string, timeZone = "UTC"): Audience["posting"] {
  const place = placeInWeek(timeZone);
  const end = Date.parse(`${asOf}T23:59:59Z`);
  // a post's first week is read a sync after its 7th day (YouTube's daily numbers a few days later); until then it's waiting, not missing
  const settled = (p: PostData) => end - p.publishedAt.getTime() >= (FIRST_WEEK_DAYS + FIRST_WEEK_SETTLE_DAYS) * DAY_MS;

  const measured = posts.filter((p) => p.views7d !== null);
  const typical = new Map<PlatformId, number>();
  for (const id of new Set(measured.map((p) => p.platform))) typical.set(id, median(measured.filter((p) => p.platform === id).map((p) => p.views7d!)));
  const scored = measured
    .filter((p) => typical.get(p.platform)! > 0)
    .map((p) => ({ platform: p.platform, at: place(p.publishedAt), score: p.views7d! / typical.get(p.platform)! }));

  const grid = (only: PlatformId | null): PostingTimes => {
    const mine = scored.filter((s) => !only || s.platform === only);
    const unmeasured = posts.filter((p) => p.views7d === null && (!only || p.platform === only));
    const at = (day: number | null, slot: number | null) => mine.filter((s) => (day === null || s.at.day === day) && (slot === null || s.at.slot === slot)).map((s) => s.score);
    return {
      days: WEEK.map((day, d) => ({ day, cells: SLOTS.map((_, t) => cellOf(at(d, t))) })),
      byDay: WEEK.map((_, d) => cellOf(at(d, null))),
      bySlot: SLOTS.map((_, t) => cellOf(at(null, t))),
      used: mine.length,
      waiting: unmeasured.filter((p) => p.firstWeekPending || !settled(p)).length,
      untracked: unmeasured.filter((p) => !p.firstWeekPending && settled(p)).length,
    };
  };

  return {
    all: grid(null),
    platforms: PLATFORM_ORDER.filter((id) => posts.some((p) => p.platform === id)).map((id) => ({ id, times: grid(id) })),
  };
}

/**
 * When followers are online, from the platform's own hourly counts (the latest
 * 30 days): for each weekday and window, the average number online in an hour.
 * Uses the first platform that reports it (only Instagram does).
 */
export function onlineTimes(hours: OnlineHour[], timeZone = "UTC"): OnlineTimes | null {
  const platform = PLATFORM_ORDER.find((id) => hours.some((h) => h.platform === id));
  if (!platform) return null;
  const mine = hours.filter((h) => h.platform === platform);
  const latest = Math.max(...mine.map((h) => h.hourStart.getTime()));
  const recent = mine.filter((h) => h.hourStart.getTime() > latest - 30 * DAY_MS);
  const place = placeInWeek(timeZone);
  const cells = WEEK.map(() => SLOTS.map(() => ({ total: 0, n: 0 })));
  for (const h of recent) {
    const { day, slot } = place(h.hourStart);
    cells[day][slot].total += h.followers;
    cells[day][slot].n++;
  }
  return {
    platform,
    days: WEEK.map((day, d) => ({ day, cells: cells[d].map((c) => (c.n ? Math.round(c.total / c.n) : null)) })),
    daysCovered: new Set(recent.map((h) => isoDate(h.hourStart))).size,
  };
}
