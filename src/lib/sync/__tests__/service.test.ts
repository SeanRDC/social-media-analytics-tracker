import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { saveConnection } from "@/lib/connect/service";
import { syncAll, syncConnection, syncWindow } from "@/lib/sync/service";

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
  await db.insert(schema.user).values({ id: "u1", name: "A", email: "a@example.com" });
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const simulated = (platform: "youtube" | "tiktok" = "youtube") => saveConnection(db, "u1", platform, tokens, { externalId: `simulated:${platform}`, name: "Sample" });

describe("syncWindow", () => {
  it("reads 180 days on the first import", () => {
    expect(syncWindow(null, NOW)).toEqual({ start: "2026-05-21", end: "2026-11-16" });
  });

  it("re-reads three days before the last sync", () => {
    expect(syncWindow(new Date("2026-11-15T06:00:00Z"), NOW)).toEqual({ start: "2026-11-12", end: "2026-11-16" });
  });

  it("never reads more than a first import after a long gap", () => {
    expect(syncWindow(new Date("2025-01-01T00:00:00Z"), NOW).start).toBe("2026-05-21");
  });
});

describe("syncConnection", () => {
  it("imports history, posts and audience and records the sync time", async () => {
    const id = await simulated();
    const out = await syncConnection(db, id, NOW);
    expect(out).toMatchObject({ status: "synced", days: 180 });
    expect(await db.select().from(schema.dailyStat)).toHaveLength(180);
    expect((await db.select().from(schema.post)).length).toBeGreaterThan(30);
    expect((await db.select().from(schema.audienceStat)).length).toBeGreaterThan(0);
    const [c] = await db.select().from(schema.connection).where(eq(schema.connection.id, id));
    expect(c.lastSyncedAt?.toISOString()).toBe(NOW.toISOString());
  });

  it("is idempotent", async () => {
    const id = await simulated();
    await syncConnection(db, id, NOW);
    const count = async () => [
      (await db.select().from(schema.dailyStat)).length,
      (await db.select().from(schema.post)).length,
      (await db.select().from(schema.postStat)).length,
      (await db.select().from(schema.audienceStat)).length,
    ];
    const before = await count();
    await db.update(schema.connection).set({ lastSyncedAt: null }).where(eq(schema.connection.id, id));
    await syncConnection(db, id, NOW);
    expect(await count()).toEqual(before);
  });

  it("skips platforms without a fetcher yet", async () => {
    vi.stubEnv("TIKTOK_CLIENT_KEY", "k");
    vi.stubEnv("TIKTOK_CLIENT_SECRET", "s");
    const id = await saveConnection(db, "u1", "tiktok", tokens, { externalId: "open-id", name: "@me" });
    expect(await syncConnection(db, id, NOW)).toEqual({ status: "unsupported" });
  });

  it("marks the connection expired when YouTube rejects the token", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: { code: 401 } }, { status: 401 })));
    const id = await saveConnection(db, "u1", "youtube", tokens, { externalId: "UC1", name: "N" });
    expect(await syncConnection(db, id, NOW)).toEqual({ status: "expired" });
    const [c] = await db.select().from(schema.connection).where(eq(schema.connection.id, id));
    expect(c.status).toBe("expired");
  });
});

describe("syncAll", () => {
  it("keeps going when one connection fails", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    await db.insert(schema.user).values({ id: "u2", name: "B", email: "b@example.com" });
    await saveConnection(db, "u2", "youtube", tokens, { externalId: "UC2", name: "Broken" });
    await simulated("tiktok");
    expect(await syncAll(db, NOW)).toEqual({ synced: 1, expired: 0, skipped: 0, failed: 1 });
  });
});
