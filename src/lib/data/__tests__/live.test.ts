import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { disconnect, saveConnection } from "@/lib/connect/service";
import { asOfDate, computeAudience, computeDailyViews, computeOverview, computePlatforms, computePosts } from "@/lib/data/compute";
import { loadDataset } from "@/lib/data/live";
import { syncConnection } from "@/lib/sync/service";

let db: Db;
const NOW = new Date("2026-11-16T06:00:00Z");
const tokens = { accessToken: "at", refreshToken: "rt", expiresAt: new Date(NOW.getTime() + 3_600_000), scopes: null };

beforeAll(async () => {
  const pg = drizzle(new PGlite(), { schema, casing: "snake_case" });
  await migrate(pg, { migrationsFolder: "drizzle" });
  db = pg as unknown as Db;
}, 30_000);

beforeEach(async () => {
  await db.delete(schema.user);
  await db.insert(schema.user).values([
    { id: "u1", name: "A", email: "a@example.com" },
    { id: "u2", name: "B", email: "b@example.com" },
  ]);
});

const connectAndImport = async (userId: string, platform: "youtube" | "tiktok" | "instagram") => {
  const id = await saveConnection(db, userId, platform, tokens, { externalId: `simulated:${platform}`, name: `Sample ${platform}` });
  await syncConnection(db, id, NOW);
  return id;
};

describe("connect → import → dashboard", () => {
  it("shows sample data until something has been imported", async () => {
    await saveConnection(db, "u1", "youtube", tokens, { externalId: "simulated:youtube", name: "Sample" });
    expect(await loadDataset(db, "u1", NOW)).toBeNull();
  });

  it("feeds every dashboard section from imported rows", async () => {
    await connectAndImport("u1", "youtube");
    await connectAndImport("u1", "tiktok");
    const loaded = (await loadDataset(db, "u1", NOW))!;
    expect(loaded.source).toBe("simulated");
    const asOf = asOfDate(loaded.dataset)!;
    expect(asOf).toBe("2026-11-16");

    const platforms = computePlatforms(loaded.dataset, asOf);
    const overview = computeOverview(loaded.dataset, asOf);
    expect(overview.connectedCount).toBe(2);
    expect(overview.metrics[30].followers).toBe(platforms.reduce((s, p) => s + p.followers!, 0));
    expect(computeDailyViews(loaded.dataset, asOf).thisWeek.reduce((s: number, v) => s + v!, 0)).toBe(overview.metrics[7].views);

    const posts = computePosts(loaded.dataset);
    expect(posts.length).toBeGreaterThan(50);
    expect(posts.every((p) => p.views >= 0 && (p.platform === "youtube" || p.platform === "tiktok"))).toBe(true);

    expect(computeAudience(loaded.dataset, asOf).sources).toEqual(["youtube"]);
  });

  it("only ever loads the signed-in user's numbers", async () => {
    await connectAndImport("u2", "youtube");
    expect(await loadDataset(db, "u1", NOW)).toBeNull();
  });

  it("drops a platform's numbers as soon as it is disconnected", async () => {
    await connectAndImport("u1", "youtube");
    await connectAndImport("u1", "tiktok");
    await disconnect(db, "u1", "tiktok");
    const loaded = (await loadDataset(db, "u1", NOW))!;
    expect(loaded.dataset.connections.map((c) => c.platform)).toEqual(["youtube"]);
    expect(computePosts(loaded.dataset).some((p) => p.platform === "tiktok")).toBe(false);
  });

  it("uses each post's latest totals after several syncs", async () => {
    const id = await connectAndImport("u1", "youtube");
    await syncConnection(db, id, new Date("2026-11-17T06:00:00Z"));
    const loaded = (await loadDataset(db, "u1", new Date("2026-11-17T06:00:00Z")))!;
    const ids = loaded.dataset.posts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(asOfDate(loaded.dataset)).toBe("2026-11-17");
  });
});

describe("best time to post", () => {
  /** A post published at `publishedAt` with lifetime views read at each [capturedAt, views]. */
  const postWithReadings = async (connectionId: string, externalId: string, publishedAt: string, readings: [string | null, number][]) => {
    const [p] = await db.insert(schema.post).values({ connectionId, externalId, title: externalId, kind: "video", publishedAt: new Date(publishedAt) }).returning();
    await db.insert(schema.postStat).values(
      readings.map(([at, views], i) => ({ postId: p.id, date: `2026-10-${String(10 + i).padStart(2, "0")}`, views, capturedAt: at ? new Date(at) : null })),
    );
  };
  const views7d = async (externalId: string) => (await loadDataset(db, "u1", NOW))!.dataset.posts.find((p) => p.title === externalId)!.views7d;

  it("records when each post's numbers were read", async () => {
    const id = await connectAndImport("u1", "youtube");
    const rows = await db.select({ capturedAt: schema.postStat.capturedAt }).from(schema.postStat).innerJoin(schema.post, eq(schema.post.id, schema.postStat.postId)).where(eq(schema.post.connectionId, id));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.capturedAt?.getTime() === NOW.getTime())).toBe(true);
  });

  it("takes each post's views from the reading nearest to exactly one week old", async () => {
    const id = await connectAndImport("u1", "youtube");
    // published Nov 1 at 20:00, so one week old at Nov 8 20:00
    await postWithReadings(id, "weekly", "2026-11-01T20:00:00Z", [
      ["2026-11-08T04:05:00Z", 700], // 16 hours early: too far
      ["2026-11-09T04:05:00Z", 900], // 8 hours late: the one
      ["2026-11-10T04:05:00Z", 1200], // a day later
    ]);
    expect(await views7d("weekly")).toBe(900);
  });

  it("leaves first-week views unknown rather than guessing", async () => {
    const id = await connectAndImport("u1", "youtube");
    await postWithReadings(id, "late", "2026-10-01T12:00:00Z", [["2026-10-11T04:00:00Z", 5000]]); // first read at 10 days old
    await postWithReadings(id, "untimed", "2026-11-01T12:00:00Z", [[null, 800]]); // read before times were recorded
    expect(await views7d("late")).toBeNull();
    expect(await views7d("untimed")).toBeNull();
  });

  it("stores and loads Instagram's followers online, hour by hour", async () => {
    await connectAndImport("u1", "instagram");
    const loaded = (await loadDataset(db, "u1", NOW))!;
    expect(loaded.dataset.online!.length).toBe(30 * 24);
    expect(loaded.dataset.online!.every((h) => h.platform === "instagram" && h.followers >= 0)).toBe(true);
    const online = computeAudience(loaded.dataset, asOfDate(loaded.dataset)!, "Asia/Manila").online!;
    expect(online.platform).toBe("instagram");
    expect(online.daysCovered).toBeGreaterThanOrEqual(30);
  });
});
