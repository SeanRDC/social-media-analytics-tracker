import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { deleteAccountData } from "@/lib/account";
import { saveConnection } from "@/lib/connect/service";
import { syncConnection } from "@/lib/sync/service";

let db: Db;
beforeAll(async () => {
  const pg = drizzle(new PGlite(), { schema, casing: "snake_case" });
  await migrate(pg, { migrationsFolder: "drizzle" });
  db = pg as unknown as Db;
}, 30_000);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("deleteAccountData", () => {
  it("revokes platform access, then deletes the person and everything about them", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (calls.push(String(url)), new Response("", { status: 200 }))));
    await db.insert(schema.user).values([
      { id: "gone", name: "A", email: "a@example.com" },
      { id: "stays", name: "B", email: "b@example.com" },
    ]);
    const t = { accessToken: "at", refreshToken: "rt", expiresAt: null, scopes: null };
    await saveConnection(db, "gone", "youtube", t, { externalId: "UC1", name: "Mine" });
    const sim = await saveConnection(db, "gone", "tiktok", t, { externalId: "simulated:tiktok", name: "Sim" });
    await syncConnection(db, sim, new Date("2026-11-16T00:00:00Z"));
    await db.insert(schema.reportSchedule).values({ userId: "gone" });
    await db.insert(schema.pushSubscription).values({ userId: "gone", endpoint: "https://push/x", p256dh: "k", auth: "a" });
    await saveConnection(db, "stays", "youtube", t, { externalId: "UC2", name: "Theirs" });

    await deleteAccountData(db, "gone");

    expect(calls.some((u) => u.includes("oauth2.googleapis.com/revoke"))).toBe(true);
    expect((await db.select().from(schema.user)).map((u) => u.id)).toEqual(["stays"]);
    expect((await db.select().from(schema.connection)).map((c) => c.accountName)).toEqual(["Theirs"]);
    for (const table of [schema.dailyStat, schema.post, schema.reportSchedule, schema.pushSubscription]) expect(await db.select().from(table)).toHaveLength(0);
  });
});
