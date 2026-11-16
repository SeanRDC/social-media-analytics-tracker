import { PGlite } from "@electric-sql/pglite";
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

const connectAndImport = async (userId: string, platform: "youtube" | "tiktok") => {
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
    expect(overview.metrics[30].followers).toBe(platforms.reduce((s, p) => s + p.followers, 0));
    expect(computeDailyViews(loaded.dataset, asOf).thisWeek.reduce((s, v) => s + v, 0)).toBe(overview.metrics[7].views);

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
