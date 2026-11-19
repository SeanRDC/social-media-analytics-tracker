import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { derivedToday, storeSnapshot } from "@/lib/sync/service";
import type { DailyRow, PlatformSnapshot, PostRow } from "@/lib/sync/types";

let db: Db;

beforeAll(async () => {
  const pg = drizzle(new PGlite(), { schema, casing: "snake_case" });
  await migrate(pg, { migrationsFolder: "drizzle" });
  db = pg as unknown as Db;
}, 30_000);

beforeEach(async () => {
  await db.delete(schema.user);
  await db.insert(schema.user).values({ id: "u1", name: "A", email: "a@example.com" });
  await db.insert(schema.connection).values({ id: "c1", userId: "u1", platform: "tiktok", externalId: "o1", accountName: "@me" });
});

const p = (externalId: string, publishedAt: string, views: number, likes = 0): PostRow => ({
  externalId,
  title: externalId,
  kind: "video",
  publishedAt: new Date(publishedAt),
  thumbnailUrl: null,
  permalink: null,
  views,
  likes,
  comments: 0,
  shares: 0,
  avgWatchSeconds: null,
});
const snap = (followers: number, posts: PostRow[]): PlatformSnapshot => ({ followers, daily: [], posts, audience: null, derive: true });

/** Stores a previous sync: a daily row and each post's totals on `date`. */
async function previous(date: string, followers: number, posts: PostRow[]) {
  await db.insert(schema.dailyStat).values({ connectionId: "c1", date, followers });
  for (const x of posts) {
    const [row] = await db.insert(schema.post).values({ connectionId: "c1", externalId: x.externalId, title: x.title, kind: x.kind, publishedAt: x.publishedAt }).returning();
    await db.insert(schema.postStat).values({ postId: row.id, date, views: x.views, likes: x.likes });
  }
}

describe("derivedToday", () => {
  it("leaves the first sync's activity unknown instead of zero, keeping the reported follower total", async () => {
    const [row] = await derivedToday(db, "c1", "2026-11-16", snap(1000, [p("v1", "2026-10-01", 50_000, 900)]));
    expect(row).toMatchObject({ date: "2026-11-16", followers: 1000, followersGained: null, views: null, engagements: null });
  });

  it("counts the change since the previous sync", async () => {
    await previous("2026-11-15", 990, [p("v1", "2026-10-01", 50_000, 900)]);
    const [row] = await derivedToday(db, "c1", "2026-11-16", snap(1000, [p("v1", "2026-10-01", 50_400, 930)]));
    expect(row).toMatchObject({ followers: 1000, followersGained: 10, views: 400, engagements: 30 });
  });

  it("counts all activity of a post published since the previous sync", async () => {
    await previous("2026-11-15", 990, []);
    const [row] = await derivedToday(db, "c1", "2026-11-16", snap(990, [p("new", "2026-11-16T09:00:00Z", 1200, 40)]));
    expect(row).toMatchObject({ views: 1200, engagements: 40, posts: 1 });
  });

  it("never reports negative activity when counts go down", async () => {
    await previous("2026-11-15", 990, [p("v1", "2026-10-01", 5000, 100)]);
    const [row] = await derivedToday(db, "c1", "2026-11-16", snap(985, [p("v1", "2026-10-01", 4990, 90)]));
    expect(row).toMatchObject({ followersGained: -5, views: 0, engagements: 0 });
  });

  it("gives the same answer when synced twice in one day", async () => {
    await previous("2026-11-15", 990, [p("v1", "2026-10-01", 100)]);
    const today = snap(1000, [p("v1", "2026-10-01", 160)]);
    const first = await derivedToday(db, "c1", "2026-11-16", today);
    const [post] = await db.select().from(schema.post);
    await db.insert(schema.postStat).values({ postId: post.id, date: "2026-11-16", views: 160 });
    await db.insert(schema.dailyStat).values({ connectionId: "c1", date: "2026-11-16", followers: 1000 });
    expect(await derivedToday(db, "c1", "2026-11-16", today)).toEqual(first);
  });
});

describe("storeSnapshot", () => {
  const row = (date: string, v: Partial<DailyRow>) => ({ date, followers: null, followersGained: null, views: null, engagements: null, posts: 0, watchMinutes: null, ...v });

  it("never replaces a reported value with an unknown one", async () => {
    // an earlier sync read the follower total; a later one only knows views for that day
    await storeSnapshot(db, "c1", "2026-11-16", { followers: 1000, daily: [row("2026-11-15", { followers: 990 })], posts: [], audience: null });
    await storeSnapshot(db, "c1", "2026-11-16", { followers: 1000, daily: [row("2026-11-15", { views: 410, engagements: 22 })], posts: [], audience: null });
    const [d] = await db.select().from(schema.dailyStat);
    expect(d).toMatchObject({ date: "2026-11-15", followers: 990, views: 410, engagements: 22 });
  });

  it("does replace a reported value with a newer reported one", async () => {
    await storeSnapshot(db, "c1", "2026-11-16", { followers: 1000, daily: [row("2026-11-15", { views: 300 })], posts: [], audience: null });
    await storeSnapshot(db, "c1", "2026-11-16", { followers: 1000, daily: [row("2026-11-15", { views: 410 })], posts: [], audience: null });
    const [d] = await db.select().from(schema.dailyStat);
    expect(d.views).toBe(410);
  });
});
