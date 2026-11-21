/**
 * Reads a channel's numbers from the YouTube Data API (channel, uploads,
 * lifetime video stats) and the YouTube Analytics API (daily history, per-video
 * watch time, demographics). Demographics and per-video reports are optional:
 * small channels get none, and a failure there must not lose the rest.
 */
import { addDays, isoDate } from "@/lib/dates";
import { FIRST_WEEK_DAYS } from "@/lib/data/compute";
import { ProviderError, RateLimited } from "@/lib/connect/providers";
import { getJson, withQuery } from "@/lib/connect/providers/oauth";
import type { AudienceRow, DailyRow, FetchContext, FirstWeekRow, PlatformSnapshot, PostRow, SyncWindow } from "./types";

const DATA = "https://www.googleapis.com/youtube/v3";
const ANALYTICS = "https://youtubeanalytics.googleapis.com/v2/reports";
/** How many recent uploads to keep in the library. */
/** YouTube Analytics returns at most 200 rows per video report. */
const ANALYTICS_MAX_ROWS = 200;
/** Shorts can be up to 3 minutes; the API has no Shorts flag. */
const SHORT_MAX_SECONDS = 180;
/** YouTube Analytics counts days in Pacific time. */
const ANALYTICS_ZONE = "America/Los_Angeles";
/** Its daily numbers settle a few days late; first weeks are only read once they have. */
const ANALYTICS_SETTLE_DAYS = 3;
/** First weeks read per sync (one request each), newest videos first; the rest follow on later syncs. */
const FIRST_WEEKS_PER_SYNC = 50;
const FIRST_WEEK_PARALLEL = 5;

type Row = Record<string, string | number>;

/** "PT1H2M3S" → 3723. */
export function parseDuration(iso: string): number {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0);
}

const AGE_LABELS: Record<string, string> = {
  "age13-17": "13–17",
  "age18-24": "18–24",
  "age25-34": "25–34",
  "age35-44": "35–44",
  "age45-54": "45+",
  "age55-64": "45+",
  "age65-": "45+",
};

const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0) || 0);

export async function fetchYouTube(accessToken: string, window: SyncWindow, ctx: FetchContext): Promise<PlatformSnapshot> {
  const auth = { Authorization: `Bearer ${accessToken}` };
  const data = (path: string, params: Record<string, string>) => getJson(withQuery(`${DATA}${path}`, params), `YouTube ${path}`, auth);
  const report = async (params: Record<string, string>): Promise<Row[]> => {
    const body = await getJson(withQuery(ANALYTICS, { ids: "channel==MINE", ...params }), "YouTube Analytics", auth);
    const cols = ((body.columnHeaders as { name: string }[] | undefined) ?? []).map((c) => c.name);
    return ((body.rows as (string | number)[][] | undefined) ?? []).map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
  };
  /** Optional reports: an empty result instead of an error. */
  const optional = async (params: Record<string, string>): Promise<Row[] | null> => {
    try {
      return await report(params);
    } catch (e) {
      if (e instanceof ProviderError && !(e instanceof RateLimited)) return null;
      throw e;
    }
  };

  // 1. the channel
  const channels = await data("/channels", { part: "statistics,contentDetails", mine: "true" });
  const channel = (channels.items as { statistics?: { subscriberCount?: string }; contentDetails?: { relatedPlaylists?: { uploads?: string } } }[] | undefined)?.[0];
  if (!channel) throw new ProviderError("No YouTube channel on this account", 404, "no-channel");
  const followers = num(channel.statistics?.subscriberCount);
  const uploads = channel.contentDetails?.relatedPlaylists?.uploads;

  // 2. recent uploads with lifetime stats
  const posts = uploads ? await fetchVideos(data, uploads, ctx.maxPosts) : [];

  // 3. analytics
  const range = { startDate: window.start, endDate: window.end };
  const [days, byVideo, ages, countries] = await Promise.all([
    report({ ...range, metrics: "views,estimatedMinutesWatched,subscribersGained,subscribersLost,likes,comments,shares", dimensions: "day", sort: "day" }),
    optional({ startDate: "2005-04-23", endDate: window.end, metrics: "views,averageViewDuration,shares", dimensions: "video", sort: "-views", maxResults: String(Math.min(ctx.maxPosts, ANALYTICS_MAX_ROWS)) }),
    optional({ ...range, metrics: "viewerPercentage", dimensions: "ageGroup,gender" }),
    optional({ ...range, metrics: "views", dimensions: "country", sort: "-views", maxResults: "25" }),
  ]);

  const firstWeeks = await fetchFirstWeeks(report, [...posts, ...(ctx.firstWeekMissing ?? [])], window.end, ctx.firstWeekKnown ?? new Set());

  const perVideo = new Map((byVideo ?? []).map((r) => [String(r.video), r]));
  for (const p of posts) {
    const v = perVideo.get(p.externalId);
    if (!v) continue;
    p.shares = num(v.shares);
    p.avgWatchSeconds = num(v.averageViewDuration) || null;
  }

  const totalViews = days.reduce((sum, r) => sum + num(r.views), 0);
  return { followers, daily: dailyRows(days, followers, posts), posts, audience: audienceRows(ages, countries, totalViews), firstWeeks };
}

/**
 * The whole Pacific-time days that make up a video's first week. Analytics
 * only counts whole days, so the window ends at the midnight nearest to
 * exactly FIRST_WEEK_DAYS after publishing: videos published before noon
 * stop at the 7th midnight, later ones at the 8th. Every video is measured
 * within half a day of the same age, whatever hour it went out (always
 * stopping at the 7th midnight would cut late uploads short by up to a day).
 */
export function firstWeekRange(publishedAt: Date): { start: string; end: string } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: ANALYTICS_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(publishedAt);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  const start = `${part("year")}-${part("month")}-${part("day")}`;
  const hour = Number(part("hour")) + Number(part("minute")) / 60;
  return { start, end: addDays(start, hour < 12 ? FIRST_WEEK_DAYS - 1 : FIRST_WEEK_DAYS) };
}

/**
 * Reads first-week views, from YouTube Analytics, for videos that don't have
 * them yet: each video's exact views over its first-week window. Takes this
 * sync's videos and stored ones it no longer lists. Optional and capped per
 * sync: a failure, or running out of quota, leaves the rest for the next sync
 * and never fails this one.
 */
async function fetchFirstWeeks(
  report: (params: Record<string, string>) => Promise<Row[]>,
  videos: { externalId: string; publishedAt: Date }[],
  today: string,
  known: ReadonlySet<string>,
): Promise<FirstWeekRow[]> {
  const settled = addDays(today, -ANALYTICS_SETTLE_DAYS);
  const unique = [...new Map(videos.map((v) => [v.externalId, v])).values()];
  const todo = unique
    .filter((v) => !known.has(v.externalId) && firstWeekRange(v.publishedAt).end <= settled)
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, FIRST_WEEKS_PER_SYNC);
  const out: FirstWeekRow[] = [];
  let stop = false;
  const read = async (v: { externalId: string; publishedAt: Date }) => {
    if (stop) return;
    const { start, end } = firstWeekRange(v.publishedAt);
    try {
      const rows = await report({ startDate: start, endDate: end, metrics: "views", filters: `video==${v.externalId}` });
      // no rows means no views in those days
      out.push({ externalId: v.externalId, views: rows.reduce((sum, r) => sum + num(r.views), 0) });
    } catch (e) {
      if (e instanceof RateLimited) stop = true;
      else if (!(e instanceof ProviderError)) throw e;
    }
  };
  for (let i = 0; i < todo.length && !stop; i += FIRST_WEEK_PARALLEL) await Promise.all(todo.slice(i, i + FIRST_WEEK_PARALLEL).map(read));
  return out;
}

async function fetchVideos(data: (path: string, params: Record<string, string>) => Promise<Record<string, unknown>>, playlistId: string, max: number): Promise<PostRow[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await data("/playlistItems", { part: "contentDetails", playlistId, maxResults: "50", ...(pageToken ? { pageToken } : {}) });
    for (const it of (page.items as { contentDetails?: { videoId?: string } }[] | undefined) ?? []) if (it.contentDetails?.videoId) ids.push(it.contentDetails.videoId);
    pageToken = page.nextPageToken as string | undefined;
  } while (pageToken && ids.length < max);

  const posts: PostRow[] = [];
  for (let i = 0; i < Math.min(ids.length, max); i += 50) {
    const res = await data("/videos", { part: "snippet,statistics,contentDetails", id: ids.slice(i, i + 50).join(",") });
    type Video = {
      id: string;
      snippet?: { title?: string; publishedAt?: string; thumbnails?: Record<string, { url?: string }> };
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
      contentDetails?: { duration?: string };
    };
    for (const v of (res.items as Video[] | undefined) ?? []) {
      const thumbs = v.snippet?.thumbnails ?? {};
      posts.push({
        externalId: v.id,
        title: v.snippet?.title || "Untitled video",
        kind: parseDuration(v.contentDetails?.duration ?? "") <= SHORT_MAX_SECONDS ? "short" : "video",
        publishedAt: new Date(v.snippet?.publishedAt ?? Date.now()),
        thumbnailUrl: (thumbs.medium ?? thumbs.high ?? thumbs.default)?.url ?? null,
        permalink: `https://www.youtube.com/watch?v=${v.id}`,
        views: num(v.statistics?.viewCount),
        likes: num(v.statistics?.likeCount),
        comments: num(v.statistics?.commentCount),
        shares: 0,
        avgWatchSeconds: null,
      });
    }
  }
  return posts;
}

/** Daily rows, with follower totals rebuilt backwards from today's subscriber count. */
export function dailyRows(days: Row[], followersNow: number, posts: PostRow[]): DailyRow[] {
  const published = new Map<string, number>();
  for (const p of posts) {
    const d = isoDate(p.publishedAt);
    published.set(d, (published.get(d) ?? 0) + 1);
  }
  const sorted = [...days].sort((a, b) => String(a.day).localeCompare(String(b.day)));
  const out: DailyRow[] = [];
  let followers = followersNow;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const r = sorted[i];
    const net = num(r.subscribersGained) - num(r.subscribersLost);
    const date = String(r.day);
    out.unshift({
      date,
      followers: Math.max(0, followers),
      followersGained: net,
      views: num(r.views),
      engagements: num(r.likes) + num(r.comments) + num(r.shares),
      posts: published.get(date) ?? 0,
      watchMinutes: Math.round(num(r.estimatedMinutesWatched)),
    });
    followers -= net;
  }
  return out;
}

/** Country shares are of all views in the window (the top 25 rarely cover everyone), so the rest becomes "Other". */
export function audienceRows(ages: Row[] | null, countries: Row[] | null, totalViews = 0): AudienceRow[] | null {
  if (!ages?.length && !countries?.length) return null;
  const rows: AudienceRow[] = [];
  const add = (dimension: AudienceRow["dimension"], key: string, share: number) => {
    const hit = rows.find((r) => r.dimension === dimension && r.key === key);
    if (hit) hit.share += share;
    else rows.push({ dimension, key, share });
  };
  for (const r of ages ?? []) {
    const label = AGE_LABELS[String(r.ageGroup)];
    if (label) add("age", label, num(r.viewerPercentage));
    add("gender", String(r.gender), num(r.viewerPercentage));
  }
  const listed = (countries ?? []).reduce((s, r) => s + num(r.views), 0);
  const total = Math.max(listed, totalViews);
  if (total > 0) for (const r of countries ?? []) add("country", String(r.country), (num(r.views) / total) * 100);
  return rows;
}
