/**
 * Loads one user's stored numbers in the shape `compute.ts` expects. Returns
 * null until at least one connection has finished an import, so the dashboard
 * can keep showing sample data until then.
 */
import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { audienceStat, connection, dailyStat, onlineFollowers, post, postStat } from "@/db/schema";
import { SIMULATED_PREFIX } from "@/lib/connect/providers/simulated";
import { addDays, DAY_MS, isoDate } from "@/lib/dates";
import { FIRST_WEEK_DAYS, type AudienceData, type Dataset, type PostData } from "./compute";

/** Enough for the 90-day range and the 90 days before it. */
const HISTORY_DAYS = 200;
/** A post's first-week reading must be taken within this much of exactly FIRST_WEEK_DAYS old. */
const FIRST_WEEK_SLACK_MS = DAY_MS / 2;

export type DataSource = "sample" | "live" | "simulated";

export async function loadDataset(db: Db, userId: string, now = new Date()): Promise<{ dataset: Dataset; source: Exclude<DataSource, "sample"> } | null> {
  const conns = await db.select().from(connection).where(eq(connection.userId, userId));
  const synced = conns.filter((c) => c.lastSyncedAt);
  if (!synced.length) return null;
  const ids = synced.map((c) => c.id);
  const platformOf = new Map(synced.map((c) => [c.id, c.platform]));
  const since = addDays(isoDate(now), -HISTORY_DAYS);

  const [days, posts, stats, audience, firstWeek, online] = await Promise.all([
    db
      .select()
      .from(dailyStat)
      .where(and(inArray(dailyStat.connectionId, ids), gte(dailyStat.date, since)))
      .orderBy(dailyStat.date),
    db.select().from(post).where(inArray(post.connectionId, ids)),
    // latest totals per post
    db
      .selectDistinctOn([postStat.postId])
      .from(postStat)
      .innerJoin(post, eq(post.id, postStat.postId))
      .where(inArray(post.connectionId, ids))
      .orderBy(postStat.postId, desc(postStat.date)),
    db
      .select()
      .from(audienceStat)
      .where(and(inArray(audienceStat.connectionId, ids), gte(audienceStat.date, addDays(isoDate(now), -60))))
      .orderBy(desc(audienceStat.date)),
    // readings taken around each post's 7th day (half a day either side)
    db
      .select({ postId: postStat.postId, views: postStat.views, capturedAt: postStat.capturedAt, publishedAt: post.publishedAt })
      .from(postStat)
      .innerJoin(post, eq(post.id, postStat.postId))
      .where(
        and(
          inArray(post.connectionId, ids),
          isNotNull(postStat.capturedAt),
          sql`${postStat.capturedAt} between ${post.publishedAt} + make_interval(secs => ${(FIRST_WEEK_DAYS * DAY_MS - FIRST_WEEK_SLACK_MS) / 1000}) and ${post.publishedAt} + make_interval(secs => ${(FIRST_WEEK_DAYS * DAY_MS + FIRST_WEEK_SLACK_MS) / 1000})`,
        ),
      ),
    db
      .select()
      .from(onlineFollowers)
      .where(and(inArray(onlineFollowers.connectionId, ids), gte(onlineFollowers.hourStart, new Date(now.getTime() - 35 * DAY_MS)))),
  ]);

  // of those, the reading nearest to exactly 7 days old
  const weekOld = new Map<string, { views: number; off: number }>();
  for (const r of firstWeek) {
    const off = Math.abs(r.capturedAt!.getTime() - (r.publishedAt.getTime() + FIRST_WEEK_DAYS * DAY_MS));
    const had = weekOld.get(r.postId);
    if (!had || off < had.off) weekOld.set(r.postId, { views: r.views, off });
  }

  const latest = new Map(stats.map((r) => [r.post_stat.postId, r.post_stat]));
  const postRows: PostData[] = posts.map((p) => {
    const s = latest.get(p.id);
    return {
      id: p.id,
      platform: platformOf.get(p.connectionId)!,
      title: p.title,
      kind: p.kind,
      publishedAt: p.publishedAt,
      thumbnailUrl: p.thumbnailUrl,
      permalink: p.permalink,
      views: s?.views ?? 0,
      likes: s?.likes ?? 0,
      comments: s?.comments ?? 0,
      shares: s?.shares ?? 0,
      avgWatchSeconds: s?.avgWatchSeconds ?? null,
      views7d: weekOld.get(p.id)?.views ?? null,
    };
  });

  // only each connection's most recent audience snapshot
  const audienceDate = new Map<string, string>();
  for (const a of audience) if (!audienceDate.has(a.connectionId)) audienceDate.set(a.connectionId, a.date);
  const audienceRows: AudienceData[] = audience
    .filter((a) => audienceDate.get(a.connectionId) === a.date)
    .map((a) => ({ platform: platformOf.get(a.connectionId)!, dimension: a.dimension, key: a.key, share: a.share }));

  return {
    source: synced.some((c) => c.externalId.startsWith(SIMULATED_PREFIX)) ? "simulated" : "live",
    dataset: {
      connections: synced.map((c) => ({
        platform: c.platform,
        account: c.accountName,
        status: c.status,
        daily: days.filter((d) => d.connectionId === c.id).map(({ date, followers, followersGained, views, engagements }) => ({ date, followers, followersGained, views, engagements })),
      })),
      posts: postRows,
      audience: audienceRows,
      online: online.map((h) => ({ platform: platformOf.get(h.connectionId)!, hourStart: h.hourStart, followers: h.followers })),
    },
  };
}
