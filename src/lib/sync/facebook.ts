/**
 * Facebook Page numbers through the Graph API with the stored Page token.
 * Page Insights gives daily history (90 days per request, so the first import
 * takes two requests per metric). Each metric is requested on its own so one
 * deprecated or unavailable metric doesn't lose the rest; with no daily
 * insights at all, the sync falls back to deriving today's row from totals.
 * Meta removed Page fan demographics, so there is no audience breakdown.
 */
import { graphVersion } from "@/lib/connect/providers/facebook";
import { ProviderError, RateLimited } from "@/lib/connect/providers";
import { getJson, withQuery } from "@/lib/connect/providers/oauth";
import { addDays, dateRange, isoDate } from "@/lib/dates";
import { buildDaily, titleFrom, type DayActivity } from "./daily";
import type { FetchContext, PlatformSnapshot, PostRow, SyncWindow } from "./types";

const METRICS = ["page_daily_follows_unique", "page_daily_unfollows_unique", "page_media_view", "page_post_engagements"] as const;

type Insight = { name: string; values?: { value: number | Record<string, number>; end_time: string }[] };

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "object" && v ? Object.values(v as Record<string, number>).reduce((s, x) => s + (Number(x) || 0), 0) : Number(v ?? 0) || 0);

export async function fetchFacebook(accessToken: string, window: SyncWindow, ctx: FetchContext): Promise<PlatformSnapshot> {
  const graph = (path: string, params: Record<string, string> = {}) =>
    getJson(withQuery(`https://graph.facebook.com/${graphVersion()}${path}`, params), `Facebook ${path.split("?")[0]}`, { Authorization: `Bearer ${accessToken}` });
  const page = encodeURIComponent(ctx.externalId);

  const info = await graph(`/${page}`, { fields: "followers_count,fan_count" });
  const followers = num(info.followers_count ?? info.fan_count);

  const posts = await fetchPosts(graph, page, ctx.maxPosts);

  // daily insights, one metric at a time, in 90-day chunks
  const byDay = new Map<string, DayActivity>();
  const day = (date: string) => byDay.get(date) ?? byDay.set(date, { date, net: 0, views: 0, engagements: 0 }).get(date)!;
  let any = false;
  for (const metric of METRICS) {
    for (const chunk of chunks(window)) {
      let body: Record<string, unknown>;
      try {
        // `until` is exclusive
        body = await graph(`/${page}/insights`, { metric, period: "day", since: chunk.start, until: addDays(chunk.end, 1) });
      } catch (e) {
        if (e instanceof ProviderError && !(e instanceof RateLimited)) continue;
        throw e;
      }
      for (const series of (body.data as Insight[] | undefined) ?? []) {
        for (const v of series.values ?? []) {
          // end_time marks the end of the day the value covers
          const date = addDays(isoDate(new Date(v.end_time)), -1);
          if (date < window.start || date > window.end) continue;
          any = true;
          const d = day(date);
          const value = num(v.value);
          if (metric === "page_daily_follows_unique") d.net += value;
          else if (metric === "page_daily_unfollows_unique") d.net -= value;
          else if (metric === "page_media_view") d.views += value;
          else d.engagements += value;
        }
      }
    }
  }

  if (!any) return { followers, daily: [], posts, audience: null, derive: true };
  return { followers, daily: buildDaily([...byDay.values()], followers, posts), posts, audience: null };
}

function chunks(window: SyncWindow): { start: string; end: string }[] {
  const days = dateRange(window.start, window.end);
  const out = [];
  for (let i = 0; i < days.length; i += 90) out.push({ start: days[i], end: days[Math.min(i + 89, days.length - 1)] });
  return out;
}

type Post = {
  id: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
  full_picture?: string;
  status_type?: string;
  shares?: { count?: number };
  reactions?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
  insights?: { data?: Insight[] };
};

async function fetchPosts(graph: (path: string, params?: Record<string, string>) => Promise<Record<string, unknown>>, page: string, max: number): Promise<PostRow[]> {
  const base = "id,message,created_time,permalink_url,full_picture,status_type,shares,reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)";
  const list = async (fields: string) => {
    const out: Post[] = [];
    let after: string | undefined;
    do {
      const body = await graph(`/${page}/published_posts`, { fields, limit: "50", ...(after ? { after } : {}) });
      out.push(...((body.data as Post[] | undefined) ?? []));
      const paging = body.paging as { cursors?: { after?: string }; next?: string } | undefined;
      after = paging?.next ? paging.cursors?.after : undefined;
    } while (after && out.length < max);
    return out.slice(0, max);
  };
  let raw: Post[];
  try {
    raw = await list(`${base},insights.metric(post_media_view)`);
  } catch (e) {
    // per-post views need read_insights; without it, keep the counts we can read
    if (!(e instanceof ProviderError) || e instanceof RateLimited) throw e;
    raw = await list(base);
  }
  return raw.map((p) => ({
    externalId: p.id,
    title: titleFrom(p.message, "Facebook post"),
    kind: p.status_type === "added_video" ? "video" : "post",
    publishedAt: new Date(p.created_time ?? Date.now()),
    thumbnailUrl: p.full_picture ?? null,
    permalink: p.permalink_url ?? null,
    views: num(p.insights?.data?.find((i) => i.name === "post_media_view")?.values?.[0]?.value),
    likes: p.reactions?.summary?.total_count ?? 0,
    comments: p.comments?.summary?.total_count ?? 0,
    shares: p.shares?.count ?? 0,
    avgWatchSeconds: null,
  }));
}
