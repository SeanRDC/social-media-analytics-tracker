/**
 * TikTok numbers through the Display API (v2). It reports current totals only
 * (followers, each video's counts), so daily rows are derived by the sync from
 * the change since the last sync. TikTok shares no audience demographics.
 * Counts need the user.info.stats and video.list scopes; if the person declined
 * them, the fields come back empty and count as zero.
 */
import { getJson, postJson } from "@/lib/connect/providers/oauth";
import { titleFrom } from "./daily";
import type { FetchContext, PlatformSnapshot, PostRow, SyncWindow } from "./types";

const API = "https://open.tiktokapis.com/v2";
const VIDEO_FIELDS = "id,title,video_description,create_time,cover_image_url,share_url,duration,view_count,like_count,comment_count,share_count";
/** 20 per page is the API's maximum. */
const PAGE = 20;

type Video = {
  id: string;
  title?: string;
  video_description?: string;
  create_time?: number;
  cover_image_url?: string;
  share_url?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
};

export async function fetchTikTok(accessToken: string, _window: SyncWindow, ctx: FetchContext): Promise<PlatformSnapshot> {
  const auth = { Authorization: `Bearer ${accessToken}` };
  const info = await getJson(`${API}/user/info/?fields=open_id,follower_count,likes_count,video_count`, "TikTok user info", auth);
  const user = (info.data as { user?: { follower_count?: number } } | undefined)?.user;
  const followers = Number(user?.follower_count ?? 0) || 0;

  const videos: Video[] = [];
  let cursor: number | undefined;
  for (;;) {
    const page = await postJson(`${API}/video/list/?fields=${VIDEO_FIELDS}`, { max_count: PAGE, ...(cursor ? { cursor } : {}) }, "TikTok video list", auth);
    const data = page.data as { videos?: Video[]; cursor?: number; has_more?: boolean } | undefined;
    videos.push(...(data?.videos ?? []));
    if (!data?.has_more || !data.cursor || videos.length >= ctx.maxPosts) break;
    cursor = data.cursor;
  }

  const posts: PostRow[] = videos.slice(0, ctx.maxPosts).map((v) => ({
    externalId: v.id,
    title: titleFrom(v.title || v.video_description, "TikTok video"),
    kind: "video",
    publishedAt: new Date((v.create_time ?? Date.now() / 1000) * 1000),
    thumbnailUrl: v.cover_image_url ?? null,
    permalink: v.share_url ?? null,
    views: v.view_count ?? 0,
    likes: v.like_count ?? 0,
    comments: v.comment_count ?? 0,
    shares: v.share_count ?? 0,
    avgWatchSeconds: null,
  }));

  return { followers, daily: [], posts, audience: null, derive: true };
}
