/**
 * Imports platform numbers into the database. Writes are upserts keyed by
 * connection + date (and post + date), so syncing the same days twice changes
 * nothing. Platforms without a fetcher yet (phases 4 and 5) are skipped.
 */
import { and, desc, eq, lt, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { audienceStat, connection, dailyStat, post, postStat } from "@/db/schema";
import { getAccessToken } from "@/lib/connect/service";
import { ReauthRequired } from "@/lib/connect/providers";
import { SIMULATED_PREFIX } from "@/lib/connect/providers/simulated";
import { addDays, isoDate } from "@/lib/dates";
import type { PlatformId } from "@/lib/data/types";
import { simulatedSnapshot } from "./simulated";
import { fetchFacebook } from "./facebook";
import { fetchInstagram } from "./instagram";
import type { DailyRow, FetchContext, PlatformSnapshot, SyncWindow } from "./types";
import { fetchYouTube } from "./youtube";

type Fetcher = (accessToken: string, window: SyncWindow, ctx: FetchContext) => Promise<PlatformSnapshot>;

const FETCHERS: Partial<Record<PlatformId, Fetcher>> = {
  youtube: fetchYouTube,
  facebook: fetchFacebook,
  instagram: fetchInstagram,
};

/** First import: 90 days for the longest range plus 90 before it for change percentages. */
export const FIRST_IMPORT_DAYS = 180;
/** Later syncs re-read a few days, because platforms finalise recent numbers late. */
const OVERLAP_DAYS = 3;

export type SyncResult = { status: "synced"; days: number; posts: number } | { status: "skipped" | "unsupported" | "expired" };

export function syncWindow(lastSyncedAt: Date | null, now: Date): SyncWindow {
  const end = isoDate(now);
  const start = lastSyncedAt ? addDays(isoDate(lastSyncedAt), -OVERLAP_DAYS) : addDays(end, -(FIRST_IMPORT_DAYS - 1));
  // a long gap still never reads more than a first import would
  return { start: start < addDays(end, -(FIRST_IMPORT_DAYS - 1)) ? addDays(end, -(FIRST_IMPORT_DAYS - 1)) : start, end };
}

export async function syncConnection(db: Db, connectionId: string, now = new Date()): Promise<SyncResult> {
  const [row] = await db.select().from(connection).where(eq(connection.id, connectionId));
  if (!row || row.status !== "connected") return { status: "skipped" };
  const window = syncWindow(row.lastSyncedAt, now);

  let snapshot: PlatformSnapshot;
  if (row.externalId.startsWith(SIMULATED_PREFIX)) {
    snapshot = simulatedSnapshot(row.platform, window);
  } else {
    const fetcher = FETCHERS[row.platform];
    if (!fetcher) return { status: "unsupported" };
    try {
      snapshot = await fetcher(await getAccessToken(db, row.id), window, { externalId: row.externalId });
    } catch (e) {
      if (!(e instanceof ReauthRequired)) throw e;
      await db.update(connection).set({ status: "expired" }).where(eq(connection.id, row.id));
      return { status: "expired" };
    }
  }

  await store(db, row.id, window.end, snapshot);
  await db.update(connection).set({ lastSyncedAt: now }).where(eq(connection.id, row.id));
  return { status: "synced", days: snapshot.daily.length, posts: snapshot.posts.length };
}

async function store(db: Db, connectionId: string, today: string, snapshot: PlatformSnapshot) {
  await db.transaction(async (tx) => {
    const s = snapshot.derive ? { ...snapshot, daily: await derivedToday(tx as unknown as Db, connectionId, today, snapshot) } : snapshot;
    if (s.daily.length) {
      await tx
        .insert(dailyStat)
        .values(s.daily.map((d) => ({ connectionId, ...d })))
        .onConflictDoUpdate({
          target: [dailyStat.connectionId, dailyStat.date],
          set: {
            followers: sql`excluded.followers`,
            followersGained: sql`excluded.followers_gained`,
            views: sql`excluded.views`,
            engagements: sql`excluded.engagements`,
            posts: sql`excluded.posts`,
            watchMinutes: sql`excluded.watch_minutes`,
          },
        });
    }

    if (s.posts.length) {
      const ids = await tx
        .insert(post)
        .values(s.posts.map((p) => ({ connectionId, externalId: p.externalId, title: p.title, kind: p.kind, publishedAt: p.publishedAt, thumbnailUrl: p.thumbnailUrl, permalink: p.permalink })))
        .onConflictDoUpdate({
          target: [post.connectionId, post.externalId],
          set: { title: sql`excluded.title`, kind: sql`excluded.kind`, thumbnailUrl: sql`excluded.thumbnail_url`, permalink: sql`excluded.permalink` },
        })
        .returning({ id: post.id, externalId: post.externalId });
      const idOf = new Map(ids.map((r) => [r.externalId, r.id]));
      await tx
        .insert(postStat)
        .values(
          s.posts.map((p) => ({ postId: idOf.get(p.externalId)!, date: today, views: p.views, likes: p.likes, comments: p.comments, shares: p.shares, avgWatchSeconds: p.avgWatchSeconds })),
        )
        .onConflictDoUpdate({
          target: [postStat.postId, postStat.date],
          set: {
            views: sql`excluded.views`,
            likes: sql`excluded.likes`,
            comments: sql`excluded.comments`,
            shares: sql`excluded.shares`,
            avgWatchSeconds: sql`excluded.avg_watch_seconds`,
          },
        });
    }

    if (s.audience) {
      await tx.delete(audienceStat).where(and(eq(audienceStat.connectionId, connectionId), eq(audienceStat.date, today)));
      if (s.audience.length) await tx.insert(audienceStat).values(s.audience.map((a) => ({ connectionId, date: today, ...a })));
    }
  });
}

/**
 * Today's row for a platform that only reports current totals: followers from
 * the change since the previous stored day; views and engagement from each
 * post's change since its previous stats. With no earlier sync there is no
 * baseline, so lifetime totals are not counted as today's activity.
 */
export async function derivedToday(db: Db, connectionId: string, today: string, s: PlatformSnapshot): Promise<DailyRow[]> {
  const [prevDay] = await db
    .select()
    .from(dailyStat)
    .where(and(eq(dailyStat.connectionId, connectionId), lt(dailyStat.date, today)))
    .orderBy(desc(dailyStat.date))
    .limit(1);
  const prevStats = await db
    .selectDistinctOn([postStat.postId], { externalId: post.externalId, views: postStat.views, likes: postStat.likes, comments: postStat.comments, shares: postStat.shares })
    .from(postStat)
    .innerJoin(post, eq(post.id, postStat.postId))
    .where(and(eq(post.connectionId, connectionId), lt(postStat.date, today)))
    .orderBy(postStat.postId, desc(postStat.date));
  const before = new Map(prevStats.map((p) => [p.externalId, p]));

  let views = 0;
  let engagements = 0;
  for (const p of s.posts) {
    const prev = before.get(p.externalId);
    const eng = p.likes + p.comments + p.shares;
    if (prev) {
      // never negative: a removed like or a platform correction is not "minus" activity
      views += Math.max(0, p.views - prev.views);
      engagements += Math.max(0, eng - (prev.likes + prev.comments + prev.shares));
    } else if (prevDay && isoDate(p.publishedAt) > prevDay.date) {
      // published since the last sync: all of its activity is new
      views += p.views;
      engagements += eng;
    }
  }
  return [
    {
      date: today,
      followers: s.followers,
      followersGained: prevDay ? s.followers - prevDay.followers : 0,
      views,
      engagements,
      posts: s.posts.filter((p) => isoDate(p.publishedAt) === today).length,
      watchMinutes: null,
    },
  ];
}

/** Daily job: sync every connected account; one failure never stops the rest. */
export async function syncAll(db: Db, now = new Date()) {
  const rows = await db.select({ id: connection.id, platform: connection.platform }).from(connection).where(eq(connection.status, "connected"));
  const result = { synced: 0, expired: 0, skipped: 0, failed: 0 };
  for (const r of rows) {
    try {
      const out = await syncConnection(db, r.id, now);
      if (out.status === "synced") result.synced++;
      else if (out.status === "expired") result.expired++;
      else result.skipped++;
    } catch (e) {
      result.failed++;
      console.error(`[sync] ${r.platform} ${r.id} failed:`, e instanceof Error ? e.message : e);
    }
  }
  return result;
}
