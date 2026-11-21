/**
 * Instagram Professional account numbers through Facebook Login (graph.facebook.com),
 * read by the Instagram account id with the linked Page's token.
 *
 * Daily views and interactions come from Meta's account insights, one UTC day per
 * request (`metric_type=total_value` returns one exact total for the range).
 * Days Meta does not report stay empty. Only today's follower total is known.
 * If the account has no daily insights at all, the sync falls back to the change
 * in totals between syncs.
 * The API reports current totals (followers, each post's views and counts), so
 * daily rows are derived by the sync from the change since the last sync.
 * Demographics need 100+ followers and are optional.
 */
import { ProviderError, RateLimited } from "@/lib/connect/providers";
import { graph } from "@/lib/connect/providers/facebook";
import { getJson, withQuery } from "@/lib/connect/providers/oauth";
import type { PostKind } from "@/lib/data/types";
import { ageLabel, sharesOf, titleFrom } from "./daily";
import { addDays, dateRange, isoDate } from "@/lib/dates";
import type { AudienceRow, DailyRow, FetchContext, OnlineHourRow, PlatformSnapshot, PostRow, SyncWindow } from "./types";

/** Meta keeps account metrics for about 90 days. */
const MAX_DAYS = 90;
/** Day requests in flight at once. */
const PARALLEL = 5;
const DAY_SECONDS = 86_400;

type Media = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  timestamp?: string;
  permalink?: string;
  thumbnail_url?: string;
  media_url?: string;
  like_count?: number;
  comments_count?: number;
  insights?: { data?: { name: string; values?: { value: number }[]; total_value?: { value: number } }[] };
};

const GENDER: Record<string, string> = { F: "female", M: "male", U: "user_specified" };

export async function fetchInstagram(accessToken: string, window: SyncWindow, ctx: FetchContext): Promise<PlatformSnapshot> {
  const get = (path: string, params: Record<string, string>) => getJson(withQuery(graph(path), params), `Instagram ${path}`, { Authorization: `Bearer ${accessToken}` });

  const userId = ctx.externalId;
  const me = await get(`/${encodeURIComponent(userId)}`, { fields: "username,followers_count,media_count" });
  const followers = Number(me.followers_count ?? 0) || 0;

  const posts = await fetchMedia(get, userId, ctx.maxPosts);
  const daily = await fetchDaily(get, userId, window, followers, posts);
  const audience = await fetchDemographics(get, userId);
  const onlineFollowers = await fetchOnlineFollowers(get, userId);
  // no daily insights at all (e.g. the permission was declined): fall back to totals
  if (!daily) return { followers, daily: [], posts, audience, derive: true, onlineFollowers };
  return { followers, daily, posts, audience, onlineFollowers };
}

/** Instagram reports followers online for the last 30 days only. */
const ONLINE_DAYS = 30;
const HOUR_MS = 3_600_000;

/**
 * How many followers were online in each hour of the last 30 days
 * (`online_followers`). Optional: accounts under 100 followers, or a missing
 * metric, simply give none. Asks for the whole 30 days, and if Meta refuses
 * the range, for its default (the last day), which daily syncs add up.
 */
async function fetchOnlineFollowers(get: Get, userId: string): Promise<OnlineHourRow[]> {
  const until = Math.floor(Date.now() / 1000);
  const attempts: Record<string, string>[] = [
    { metric: "online_followers", period: "lifetime", since: String(until - ONLINE_DAYS * DAY_SECONDS), until: String(until) },
    { metric: "online_followers", period: "lifetime" },
  ];
  for (const params of attempts) {
    try {
      return parseOnlineFollowers(await get(`/${encodeURIComponent(userId)}/insights`, params));
    } catch (e) {
      if (e instanceof RateLimited) throw e;
      if (!(e instanceof ProviderError)) throw e;
    }
  }
  return [];
}

/**
 * Turns Meta's answer into hours. Each value covers the day ending at its
 * `end_time` and is keyed by hour "0"–"23" from that day's start. The day's
 * start is taken from `end_time` itself, so the hours land on the right moment
 * whatever time zone Meta counts its days in. Empty days ({}) are skipped.
 */
export function parseOnlineFollowers(body: Record<string, unknown>): OnlineHourRow[] {
  const data = (body.data as { name?: string; values?: { value?: unknown; end_time?: string }[] }[] | undefined) ?? [];
  const metric = data.find((d) => d.name === "online_followers");
  const rows = new Map<number, OnlineHourRow>();
  for (const v of metric?.values ?? []) {
    const end = v.end_time ? Date.parse(v.end_time) : NaN;
    if (!Number.isFinite(end) || !v.value || typeof v.value !== "object") continue;
    const dayStart = end - 24 * HOUR_MS;
    for (const [hour, count] of Object.entries(v.value as Record<string, unknown>)) {
      const h = Number(hour);
      if (!Number.isInteger(h) || h < 0 || h > 23 || typeof count !== "number" || !Number.isFinite(count)) continue;
      const hourStart = dayStart + h * HOUR_MS;
      rows.set(hourStart, { hourStart: new Date(hourStart), followers: Math.max(0, Math.round(count)) });
    }
  }
  return [...rows.values()].sort((a, b) => a.hourStart.getTime() - b.hourStart.getTime());
}

async function fetchMedia(get: (path: string, params: Record<string, string>) => Promise<Record<string, unknown>>, userId: string, max: number): Promise<PostRow[]> {
  const base = "id,caption,media_type,media_product_type,timestamp,permalink,thumbnail_url,media_url,like_count,comments_count";
  const list = async (fields: string) => {
    const out: Media[] = [];
    let after: string | undefined;
    do {
      const body = await get(`/${encodeURIComponent(userId)}/media`, { fields, limit: "50", ...(after ? { after } : {}) });
      out.push(...((body.data as Media[] | undefined) ?? []));
      const paging = body.paging as { cursors?: { after?: string }; next?: string } | undefined;
      after = paging?.next ? paging.cursors?.after : undefined;
    } while (after && out.length < max);
    return out.slice(0, max);
  };
  let raw: Media[];
  try {
    raw = await list(`${base},insights.metric(views,shares)`);
  } catch (e) {
    if (!(e instanceof ProviderError) || e instanceof RateLimited) throw e;
    raw = await list(base);
  }
  const insight = (m: Media, name: string) => {
    const i = m.insights?.data?.find((x) => x.name === name);
    return Number(i?.total_value?.value ?? i?.values?.[0]?.value ?? 0) || 0;
  };
  return raw.map((m) => ({
    externalId: m.id,
    title: titleFrom(m.caption, m.media_product_type === "REELS" ? "Instagram reel" : "Instagram post"),
    kind: kindOf(m),
    publishedAt: new Date(m.timestamp ?? Date.now()),
    thumbnailUrl: m.thumbnail_url ?? (m.media_type === "VIDEO" ? null : (m.media_url ?? null)),
    permalink: m.permalink ?? null,
    views: insight(m, "views"),
    likes: m.like_count ?? 0,
    comments: m.comments_count ?? 0,
    shares: insight(m, "shares"),
    avgWatchSeconds: null,
  }));
}

const kindOf = (m: Media): PostKind => (m.media_product_type === "REELS" ? "reel" : m.media_type === "VIDEO" ? "video" : "post");

async function fetchDemographics(get: (path: string, params: Record<string, string>) => Promise<Record<string, unknown>>, userId: string): Promise<AudienceRow[] | null> {
  const breakdown = async (by: "age" | "country" | "gender"): Promise<[string, number][] | null> => {
    try {
      const body = await get(`/${encodeURIComponent(userId)}/insights`, { metric: "follower_demographics", period: "lifetime", metric_type: "total_value", breakdown: by });
      type Result = { dimension_values?: string[]; value?: number };
      const results = ((body.data as { total_value?: { breakdowns?: { results?: Result[] }[] } }[] | undefined)?.[0]?.total_value?.breakdowns?.[0]?.results ?? []) as Result[];
      return results.map((r) => [String(r.dimension_values?.[0] ?? ""), Number(r.value ?? 0)]);
    } catch (e) {
      // under 100 followers, or the permission was declined
      if (e instanceof ProviderError && !(e instanceof RateLimited)) return null;
      throw e;
    }
  };
  const [ages, countries, genders] = [await breakdown("age"), await breakdown("country"), await breakdown("gender")];
  if (!ages?.length && !countries?.length && !genders?.length) return null;
  return [
    ...sharesOf("age", (ages ?? []).flatMap(([k, v]) => (ageLabel(k) ? [[ageLabel(k)!, v] as [string, number]] : []))),
    ...sharesOf("country", countries ?? []),
    ...sharesOf("gender", (genders ?? []).map(([k, v]) => [GENDER[k] ?? k.toLowerCase(), v] as [string, number])),
  ];
}

type Get = (path: string, params: Record<string, string>) => Promise<Record<string, unknown>>;

/**
 * One row per day in the window: views and total interactions exactly as Meta
 * reports them for that UTC day, or null when Meta reports nothing for it.
 * Returns null when not a single day could be read.
 */
async function fetchDaily(get: Get, userId: string, window: SyncWindow, followers: number, posts: PostRow[]): Promise<DailyRow[] | null> {
  const start = window.start > addDays(window.end, -(MAX_DAYS - 1)) ? window.start : addDays(window.end, -(MAX_DAYS - 1));
  const days = dateRange(start, window.end);
  const published = new Map<string, number>();
  for (const p of posts) published.set(isoDate(p.publishedAt), (published.get(isoDate(p.publishedAt)) ?? 0) + 1);

  const read = async (date: string): Promise<{ views: number | null; engagements: number | null } | "failed"> => {
    const since = Date.parse(`${date}T00:00:00Z`) / 1000;
    try {
      const body = await get(`/${encodeURIComponent(userId)}/insights`, {
        metric: "views,total_interactions",
        period: "day",
        metric_type: "total_value",
        since: String(since),
        until: String(since + DAY_SECONDS),
      });
      const data = (body.data as { name: string; total_value?: { value?: number } }[] | undefined) ?? [];
      const value = (name: string) => {
        const v = data.find((d) => d.name === name)?.total_value?.value;
        return typeof v === "number" ? v : null;
      };
      return { views: value("views"), engagements: value("total_interactions") };
    } catch (e) {
      if (e instanceof ProviderError && !(e instanceof RateLimited)) return "failed";
      throw e;
    }
  };

  const results: Awaited<ReturnType<typeof read>>[] = [];
  for (let i = 0; i < days.length; i += PARALLEL) results.push(...(await Promise.all(days.slice(i, i + PARALLEL).map(read))));
  if (results.every((r) => r === "failed")) return null;

  return days.map((date, i) => {
    const r = results[i];
    const known = r === "failed" ? { views: null, engagements: null } : r;
    return {
      date,
      // the follower total is only known for today (Meta has no daily totals under 100 followers)
      followers: date === window.end ? followers : null,
      followersGained: null,
      views: known.views,
      engagements: known.engagements,
      posts: published.get(date) ?? 0,
      watchMinutes: null,
    };
  });
}
