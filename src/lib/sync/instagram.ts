/**
 * Instagram Professional account numbers through Facebook Login (graph.facebook.com),
 * read by the Instagram account id with the linked Page's token.
 * The API reports current totals (followers, each post's views and counts), so
 * daily rows are derived by the sync from the change since the last sync.
 * Demographics need 100+ followers and are optional.
 */
import { ProviderError, RateLimited } from "@/lib/connect/providers";
import { graph } from "@/lib/connect/providers/facebook";
import { getJson, withQuery } from "@/lib/connect/providers/oauth";
import type { PostKind } from "@/lib/data/types";
import { ageLabel, sharesOf, titleFrom } from "./daily";
import type { AudienceRow, FetchContext, PlatformSnapshot, PostRow, SyncWindow } from "./types";

const MAX_POSTS = 100;

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

export async function fetchInstagram(accessToken: string, _window: SyncWindow, ctx: FetchContext): Promise<PlatformSnapshot> {
  const get = (path: string, params: Record<string, string>) => getJson(withQuery(graph(path), params), `Instagram ${path}`, { Authorization: `Bearer ${accessToken}` });

  const userId = ctx.externalId;
  const me = await get(`/${encodeURIComponent(userId)}`, { fields: "username,followers_count,media_count" });
  const followers = Number(me.followers_count ?? 0) || 0;

  const posts = await fetchMedia(get, userId);
  const audience = await fetchDemographics(get, userId);
  return { followers, daily: [], posts, audience, derive: true };
}

async function fetchMedia(get: (path: string, params: Record<string, string>) => Promise<Record<string, unknown>>, userId: string): Promise<PostRow[]> {
  const base = "id,caption,media_type,media_product_type,timestamp,permalink,thumbnail_url,media_url,like_count,comments_count";
  const list = async (fields: string) => {
    const out: Media[] = [];
    let after: string | undefined;
    do {
      const body = await get(`/${encodeURIComponent(userId)}/media`, { fields, limit: "50", ...(after ? { after } : {}) });
      out.push(...((body.data as Media[] | undefined) ?? []));
      const paging = body.paging as { cursors?: { after?: string }; next?: string } | undefined;
      after = paging?.next ? paging.cursors?.after : undefined;
    } while (after && out.length < MAX_POSTS);
    return out.slice(0, MAX_POSTS);
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
