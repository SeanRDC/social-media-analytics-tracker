import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { acceptTerms, hasAcceptedTerms } from "@/lib/consent";
import { TERMS_VERSION } from "@/lib/brand";

let db: Db;

beforeAll(async () => {
  const pg = drizzle(new PGlite(), { schema, casing: "snake_case" });
  await migrate(pg, { migrationsFolder: "drizzle" });
  db = pg as unknown as Db;
}, 30_000);

beforeEach(async () => {
  await db.delete(schema.user);
  await db.insert(schema.user).values({ id: "u1", name: "A", email: "a@example.com" });
});

describe("terms acceptance", () => {
  it("is missing for a new account", async () => {
    expect(await hasAcceptedTerms(db, "u1")).toBe(false);
  });

  it("records the current version with a timestamp", async () => {
    const before = Date.now();
    await acceptTerms(db, "u1");
    expect(await hasAcceptedTerms(db, "u1")).toBe(true);
    const [row] = await db.select().from(schema.termsAcceptance);
    expect(row).toMatchObject({ userId: "u1", version: TERMS_VERSION });
    expect(row.acceptedAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it("asks again when the terms change", async () => {
    await db.insert(schema.termsAcceptance).values({ userId: "u1", version: "2000-01-01" });
    expect(await hasAcceptedTerms(db, "u1")).toBe(false);
    await acceptTerms(db, "u1");
    expect(await hasAcceptedTerms(db, "u1")).toBe(true);
    expect(await db.select().from(schema.termsAcceptance)).toHaveLength(1);
  });

  it("is deleted with the account", async () => {
    await acceptTerms(db, "u1");
    await db.delete(schema.user);
    expect(await db.select().from(schema.termsAcceptance)).toHaveLength(0);
  });
});
