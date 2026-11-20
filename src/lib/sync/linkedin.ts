/**
 * LinkedIn Page numbers through the Community Management API (versioned /rest
 * endpoints). Daily follower gains and share statistics give history; the total
 * comes from networkSizes. Impressions stand in for views. LinkedIn shares no
 * age breakdown and reports countries as geo ids, so there are no demographics.
 *
 * Rest.li 2.0 query syntax: the structure characters ( ) : , stay as they are;
 * only the values inside (URNs) are URL-encoded.
 */
import { linkedinVersion } from "@/lib/connect/providers/linkedin";
import { ProviderError, RateLimited } from "@/lib/connect/providers";
import { getJson } from "@/lib/connect/providers/oauth";
import { addDays, isoDate, parseIso } from "@/lib/dates";
import { buildDaily, titleFrom, type DayActivity } from "./daily";
import type { FetchContext, PlatformSnapshot, PostRow, SyncWindow } from "./types";

const API = "https://api.linkedin.com/rest";
/** LinkedIn returns at most 100 posts per request. */
const LINKEDIN_MAX_POSTS = 100;

type ShareStats = { impressionCount?: number; likeCount?: number; commentCount?: number; shareCount?: number };

const enc = encodeURIComponent;

export async function fetchLinkedIn(accessToken: string, window: SyncWindow, ctx: FetchContext): Promise<PlatformSnapshot> {
  const headers = { Authorization: `Bearer ${accessToken}`, "LinkedIn-Version": linkedinVersion(), "X-Restli-Protocol-Version": "2.0.0" };
  const get = (pathAndQuery: string, what: string) => getJson(`${API}${pathAndQuery}`, `LinkedIn ${what}`, headers);
  const optional = async (pathAndQuery: string, what: string) => {
    try {
      return await get(pathAndQuery, what);
    } catch (e) {
      if (e instanceof ProviderError && !(e instanceof RateLimited)) return null;
      throw e;
    }
  };
  const org = `urn:li:organization:${ctx.externalId}`;

  const size = await get(`/networkSizes/${enc(org)}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`, "follower count");
  const followers = Number(size.firstDegreeSize ?? 0) || 0;

  // the end of the range is exclusive, so it is the start of the day after the window
  const interval = `(timeRange:(start:${parseIso(window.start).getTime()},end:${parseIso(addDays(window.end, 1)).getTime()}),timeGranularityType:DAY)`;
  const [gains, shares] = await Promise.all([
    optional(`/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${enc(org)}&timeIntervals=${interval}`, "follower gains"),
    optional(`/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${enc(org)}&timeIntervals=${interval}`, "share statistics"),
  ]);

  const byDay = new Map<string, DayActivity>();
  const day = (ms: number) => {
    const date = isoDate(new Date(ms));
    return byDay.get(date) ?? byDay.set(date, { date, net: 0, views: 0, engagements: 0 }).get(date)!;
  };
  type Gain = { timeRange?: { start: number }; followerGains?: { organicFollowerGain?: number; paidFollowerGain?: number } };
  for (const e of (gains?.elements as Gain[] | undefined) ?? []) {
    if (e.timeRange) day(e.timeRange.start).net += (e.followerGains?.organicFollowerGain ?? 0) + (e.followerGains?.paidFollowerGain ?? 0);
  }
  type Share = { timeRange?: { start: number }; totalShareStatistics?: ShareStats };
  for (const e of (shares?.elements as Share[] | undefined) ?? []) {
    if (!e.timeRange) continue;
    const s = e.totalShareStatistics ?? {};
    const d = day(e.timeRange.start);
    d.views += s.impressionCount ?? 0;
    d.engagements += (s.likeCount ?? 0) + (s.commentCount ?? 0) + (s.shareCount ?? 0);
  }

  const posts = await fetchPosts(get, optional, org, Math.min(ctx.maxPosts, LINKEDIN_MAX_POSTS));
  if (!gains && !shares) return { followers, daily: [], posts, audience: null, derive: true };
  return { followers, daily: buildDaily([...byDay.values()], followers, posts), posts, audience: null };
}

async function fetchPosts(
  get: (q: string, what: string) => Promise<Record<string, unknown>>,
  optional: (q: string, what: string) => Promise<Record<string, unknown> | null>,
  org: string,
  max: number,
): Promise<PostRow[]> {
  const body = await get(`/posts?author=${enc(org)}&q=author&count=${max}&sortBy=LAST_MODIFIED`, "posts");
  type Post = { id: string; commentary?: string; publishedAt?: number; createdAt?: number };
  const list = ((body.elements as Post[] | undefined) ?? []).filter((p) => p.id);
  if (!list.length) return [];

  const shares = list.filter((p) => p.id.startsWith("urn:li:share:")).map((p) => enc(p.id));
  const ugc = list.filter((p) => p.id.startsWith("urn:li:ugcPost:")).map((p) => enc(p.id));
  const params = [shares.length ? `shares=List(${shares.join(",")})` : "", ugc.length ? `ugcPosts=List(${ugc.join(",")})` : ""].filter(Boolean).join("&");
  const stats = await optional(`/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${enc(org)}&${params}`, "post statistics");
  const byPost = new Map<string, ShareStats>();
  for (const e of (stats?.elements as { share?: string; ugcPost?: string; totalShareStatistics?: ShareStats }[] | undefined) ?? []) {
    const id = e.share ?? e.ugcPost;
    if (id) byPost.set(id, e.totalShareStatistics ?? {});
  }

  return list.map((p) => {
    const s = byPost.get(p.id) ?? {};
    return {
      externalId: p.id,
      title: titleFrom(p.commentary, "LinkedIn post"),
      kind: "post",
      publishedAt: new Date(p.publishedAt ?? p.createdAt ?? Date.now()),
      thumbnailUrl: null,
      permalink: `https://www.linkedin.com/feed/update/${p.id}`,
      views: s.impressionCount ?? 0,
      likes: s.likeCount ?? 0,
      comments: s.commentCount ?? 0,
      shares: s.shareCount ?? 0,
      avgWatchSeconds: null,
    };
  });
}
