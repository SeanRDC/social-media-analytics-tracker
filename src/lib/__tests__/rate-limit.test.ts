import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { hit } from "@/lib/rate-limit";

let db: Db;
beforeAll(async () => {
  const pg = drizzle(new PGlite(), { schema, casing: "snake_case" });
  await migrate(pg, { migrationsFolder: "drizzle" });
  db = pg as unknown as Db;
}, 30_000);

const LIMIT = { max: 2, windowSeconds: 60 };

describe("hit", () => {
  it("allows up to the limit in a window, then says how long to wait", async () => {
    const t = 1_000_000;
    expect((await hit(db, "a", LIMIT, t)).ok).toBe(true);
    expect((await hit(db, "a", LIMIT, t + 1000)).ok).toBe(true);
    expect(await hit(db, "a", LIMIT, t + 2000)).toEqual({ ok: false, retryAfterSeconds: 58 });
  });

  it("starts a fresh window once the old one has passed", async () => {
    const t = 5_000_000;
    await hit(db, "b", LIMIT, t);
    await hit(db, "b", LIMIT, t);
    expect((await hit(db, "b", LIMIT, t)).ok).toBe(false);
    expect((await hit(db, "b", LIMIT, t + 60_000)).ok).toBe(true);
  });

  it("keeps each key separate", async () => {
    const t = 9_000_000;
    await hit(db, "user:1", LIMIT, t);
    await hit(db, "user:1", LIMIT, t);
    expect((await hit(db, "user:2", LIMIT, t)).ok).toBe(true);
  });
});
