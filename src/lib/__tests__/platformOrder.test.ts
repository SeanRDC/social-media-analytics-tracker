import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { inOrder, isDefaultOrder, loadPlatformOrder, normalizeOrder, storePlatformOrder } from "@/lib/platformOrder";

describe("platform order rules", () => {
  it("keeps a valid order as it is", () => {
    expect(normalizeOrder(["instagram", "tiktok", "youtube", "facebook", "linkedin"])).toEqual(["instagram", "tiktok", "youtube", "facebook", "linkedin"]);
  });

  it("drops unknown and repeated ids and adds missing platforms in the default order", () => {
    expect(normalizeOrder(["tiktok", "myspace", "tiktok", 42, "instagram"])).toEqual(["tiktok", "instagram", "youtube", "facebook", "linkedin"]);
    expect(normalizeOrder(null)).toEqual(["youtube", "facebook", "tiktok", "linkedin", "instagram"]);
    expect(normalizeOrder("youtube")).toEqual(["youtube", "facebook", "tiktok", "linkedin", "instagram"]);
  });

  it("knows the default order", () => {
    expect(isDefaultOrder(["youtube", "facebook", "tiktok", "linkedin", "instagram"])).toBe(true);
    expect(isDefaultOrder(["youtube"])).toBe(true);
    expect(isDefaultOrder(["facebook", "youtube"])).toBe(false);
  });

  it("sorts items carrying a platform id", () => {
    const items = [{ id: "youtube" as const }, { id: "tiktok" as const }, { id: "instagram" as const }];
    expect(inOrder(items, ["instagram", "youtube", "tiktok"]).map((x) => x.id)).toEqual(["instagram", "youtube", "tiktok"]);
  });
});

describe("saved platform order", () => {
  let db: Db;
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

  it("is the default until someone arranges their cards", async () => {
    expect(await loadPlatformOrder(db, "u1")).toEqual(["youtube", "facebook", "tiktok", "linkedin", "instagram"]);
  });

  it("follows the person, and only that person", async () => {
    await storePlatformOrder(db, "u1", ["tiktok", "instagram", "youtube", "facebook", "linkedin"]);
    expect(await loadPlatformOrder(db, "u1")).toEqual(["tiktok", "instagram", "youtube", "facebook", "linkedin"]);
    expect(await loadPlatformOrder(db, "u2")).toEqual(["youtube", "facebook", "tiktok", "linkedin", "instagram"]);
    await storePlatformOrder(db, "u1", ["linkedin"]);
    expect(await loadPlatformOrder(db, "u1")).toEqual(["linkedin", "youtube", "facebook", "tiktok", "instagram"]);
  });

  it("cleans up whatever is sent before storing it", async () => {
    expect(await storePlatformOrder(db, "u1", ["<script>", "instagram", "instagram"])).toEqual(["instagram", "youtube", "facebook", "tiktok", "linkedin"]);
  });

  it("stores the default order as no row, so resetting leaves nothing behind", async () => {
    await storePlatformOrder(db, "u1", ["tiktok"]);
    await storePlatformOrder(db, "u1", ["youtube", "facebook", "tiktok", "linkedin", "instagram"]);
    expect(await db.select().from(schema.platformOrder)).toEqual([]);
  });

  it("is deleted with the account", async () => {
    await storePlatformOrder(db, "u1", ["tiktok"]);
    await db.delete(schema.user);
    expect(await db.select().from(schema.platformOrder)).toEqual([]);
  });
});
