/**
 * Imports platform numbers into the database. Writes are upserts keyed by
 * connection + date (and post + date), so syncing the same days twice changes
 * nothing. Platforms without a fetcher (X) are skipped.
 */
import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { audienceStat, connection, dailyStat, post, postStat } from "@/db/schema";
import { expiredValues, getAccessToken } from "@/lib/connect/service";
import { ProviderError, RateLimited, ReauthRequired } from "@/lib/connect/providers";
import { SIMULATED_PREFIX } from "@/lib/connect/providers/simulated";
import { addDays, isoDate } from "@/lib/dates";
import type { PlatformId } from "@/lib/data/types";
import { logEvent } from "@/lib/log";
import { simulatedSnapshot } from "./simulated";
import { fetchFacebook } from "./facebook";
import { fetchInstagram } from "./instagram";
import { fetchLinkedIn } from "./linkedin";
import { fetchTikTok } from "./tiktok";
import type { DailyRow, FetchContext, PlatformSnapshot, SyncWindow } from "./types";
import { fetchYouTube } from "./youtube";

type Fetcher = (accessToken: string, window: SyncWindow, ctx: FetchContext) => Promise<PlatformSnapshot>;

const FETCHERS: Partial<Record<PlatformId, Fetcher>> = {
  youtube: fetchYouTube,
  facebook: fetchFacebook,
  instagram: fetchInstagram,
  tiktok: fetchTikTok,
  linkedin: fetchLinkedIn,
};

/** First import: 90 days for the longest range plus 90 before it for change percentages. */
export const FIRST_IMPORT_DAYS = 180;
/** Later syncs re-read a few days, because platforms finalise recent numbers late. */
const OVERLAP_DAYS = 3;

export type SyncResult = { status: "synced"; days: number; posts: number } | { status: "skipped" | "unsupported" | "expired" | "deferred" };

/** A short, safe reason for Settings: our own error messages carry no tokens; anything else is generic. */
const reasonOf = (e: unknown) => (e instanceof ProviderError ? e.message : "Unexpected error while importing").slice(0, 200);

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

  const fetcher = FETCHERS[row.platform];
  const simulated = row.externalId.startsWith(SIMULATED_PREFIX);
  if (!simulated && !fetcher) return { status: "unsupported" };

  let snapshot: PlatformSnapshot;
  try {
    snapshot = simulated ? simulatedSnapshot(row.platform, window) : await fetcher!(await getAccessToken(db, row.id), window, { externalId: row.externalId });
    await storeSnapshot(db, row.id, window.end, snapshot);
  } catch (e) {
    if (e instanceof ReauthRequired) {
      await db.update(connection).set({ ...expiredValues(now), lastSyncError: e.message.slice(0, 200), lastSyncErrorAt: now }).where(eq(connection.id, row.id));
      logEvent("warn", "sync_reauth", { platform: row.platform, connectionId: row.id, message: e.message.slice(0, 200) });
      return { status: "expired" };
    }
    await db.update(connection).set({ lastSyncError: e instanceof RateLimited ? "The platform asked us to slow down; we'll try again later." : reasonOf(e), lastSyncErrorAt: now }).where(eq(connection.id, row.id));
    // a quota or rate limit is not a fault: the next run picks it up
    if (e instanceof RateLimited) return { status: "deferred" };
    throw e;
  }

  await db.update(connection).set({ lastSyncedAt: now, lastSyncError: null, lastSyncErrorAt: null }).where(eq(connection.id, row.id));
  return { status: "synced", days: snapshot.daily.length, posts: snapshot.posts.length };
}

/** Writes one sync's numbers. A value the platform reported is never replaced by an unknown (null) one. */
export async function storeSnapshot(db: Db, connectionId: string, today: string, snapshot: PlatformSnapshot) {
  await db.transaction(async (tx) => {
    const s = snapshot.derive ? { ...snapshot, daily: await derivedToday(tx as unknown as Db, connectionId, today, snapshot) } : snapshot;
    if (s.daily.length) {
      await tx
        .insert(dailyStat)
        .values(s.daily.map((d) => ({ connectionId, ...d })))
        .onConflictDoUpdate({
          target: [dailyStat.connectionId, dailyStat.date],
          set: {
            followers: sql`coalesce(excluded.followers, ${dailyStat.followers})`,
            followersGained: sql`coalesce(excluded.followers_gained, ${dailyStat.followersGained})`,
            views: sql`coalesce(excluded.views, ${dailyStat.views})`,
            engagements: sql`coalesce(excluded.engagements, ${dailyStat.engagements})`,
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
  // with no earlier sync there is no baseline: the day's activity is unknown, not zero
  const baseline = Boolean(prevDay);
  return [
    {
      date: today,
      followers: s.followers,
      followersGained: prevDay && prevDay.followers !== null ? s.followers - prevDay.followers : null,
      views: baseline ? views : null,
      engagements: baseline ? engagements : null,
      posts: s.posts.filter((p) => isoDate(p.publishedAt) === today).length,
      watchMinutes: null,
    },
  ];
}

export interface SyncAllOptions {
  /** Stop starting new syncs after this long; the next run continues (default 4 minutes). */
  budgetMs?: number;
  /** Accounts synced at the same time (default 4). */
  concurrency?: number;
}

/**
 * Daily job: sync every connected account not yet synced today, stalest first,
 * a few at a time, within a time budget. One failure never stops the rest, and
 * running it again the same day only picks up what is left.
 */
export async function syncAll(db: Db, now = new Date(), { budgetMs = 240_000, concurrency = 4 }: SyncAllOptions = {}) {
  const started = Date.now();
  const today = isoDate(now);
  const rows = (
    await db
      .select({ id: connection.id, platform: connection.platform, lastSyncedAt: connection.lastSyncedAt })
      .from(connection)
      .where(eq(connection.status, "connected"))
      .orderBy(sql`${connection.lastSyncedAt} asc nulls first`, asc(connection.id))
  ).filter((r) => !r.lastSyncedAt || isoDate(r.lastSyncedAt) !== today);

  const result = { synced: 0, expired: 0, deferred: 0, skipped: 0, failed: 0, remaining: 0 };
  let next = 0;
  const worker = async () => {
    while (next < rows.length) {
      if (Date.now() - started > budgetMs) {
        result.remaining = rows.length - next;
        next = rows.length;
        return;
      }
      const r = rows[next++];
      try {
        const out = await syncConnection(db, r.id, now);
        if (out.status === "synced") result.synced++;
        else if (out.status === "expired") result.expired++;
        else if (out.status === "deferred") result.deferred++;
        else result.skipped++;
      } catch (e) {
        result.failed++;
        logEvent("error", "sync_failed", { platform: r.platform, connectionId: r.id, message: reasonOf(e) });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return result;
}
