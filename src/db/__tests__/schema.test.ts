import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";

async function freshDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

describe("database schema", () => {
  let db: Awaited<ReturnType<typeof freshDb>>;

  beforeEach(async () => {
    db = await freshDb();
    await db.insert(schema.user).values({ id: "u1", name: "Northbay Studio", email: "hello@northbay.studio" });
    await db.insert(schema.connection).values({ id: "c1", userId: "u1", platform: "youtube", externalId: "UC123", accountName: "Northbay Studio" });
  });

  it("stores a daily snapshot per connection", async () => {
    await db.insert(schema.dailyStat).values({ connectionId: "c1", date: "2026-11-15", followers: 112400, followersGained: 180, views: 98000, engagements: 5000, posts: 1 });
    const rows = await db.select().from(schema.dailyStat).where(eq(schema.dailyStat.connectionId, "c1"));
    expect(rows).toHaveLength(1);
    expect(rows[0].followers).toBe(112400);
    expect(rows[0].views).toBe(98000);
  });

  it("allows only one snapshot per connection per day", async () => {
    const row = { connectionId: "c1", date: "2026-11-15", followers: 1, followersGained: 0, views: 0, engagements: 0, posts: 0 };
    await db.insert(schema.dailyStat).values(row);
    await expect(db.insert(schema.dailyStat).values(row)).rejects.toThrow();
  });

  it("allows one connection per platform per user", async () => {
    await expect(db.insert(schema.connection).values({ id: "c2", userId: "u1", platform: "youtube", externalId: "UC999", accountName: "Other" })).rejects.toThrow();
  });

  it("deletes a user's connections and their stats with the user", async () => {
    await db.insert(schema.dailyStat).values({ connectionId: "c1", date: "2026-11-15", followers: 1, followersGained: 0, views: 0, engagements: 0, posts: 0 });
    await db.delete(schema.user).where(eq(schema.user.id, "u1"));
    expect(await db.select().from(schema.connection)).toHaveLength(0);
    expect(await db.select().from(schema.dailyStat)).toHaveLength(0);
  });

  it("defaults new connections to connected", async () => {
    const [c] = await db.select().from(schema.connection).where(eq(schema.connection.id, "c1"));
    expect(c.status).toBe("connected");
  });
});
