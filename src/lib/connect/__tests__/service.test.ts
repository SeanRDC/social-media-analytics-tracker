import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { decrypt } from "@/lib/connect/crypto";
import { ReauthRequired } from "@/lib/connect/providers";
import { disconnect, getAccessToken, listConnections, refreshExpiring, saveConnection } from "@/lib/connect/service";

let db: Db;
const HOUR = 60 * 60 * 1000;
const tokens = (over: Partial<{ accessToken: string; refreshToken: string | null; expiresAt: Date | null }> = {}) => ({
  accessToken: "access-1",
  refreshToken: "refresh-1",
  expiresAt: new Date(Date.now() + HOUR),
  scopes: "a b",
  ...over,
});

beforeAll(async () => {
  const pg = drizzle(new PGlite(), { schema, casing: "snake_case" });
  await migrate(pg, { migrationsFolder: "drizzle" });
  db = pg as unknown as Db;
}, 30_000);

beforeEach(async () => {
  await db.delete(schema.user);
  await db.insert(schema.user).values({ id: "u1", name: "A", email: "a@example.com" });
  // live credentials so the real refresh code runs against a stubbed fetch
  vi.stubEnv("GOOGLE_CLIENT_ID", "id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const row = async (id: string) => (await db.select().from(schema.connection).where(eq(schema.connection.id, id)))[0];

describe("saveConnection", () => {
  it("stores tokens encrypted", async () => {
    const id = await saveConnection(db, "u1", "youtube", tokens(), { externalId: "UC1", name: "Northbay" });
    const r = await row(id);
    expect(r.accessTokenEnc).not.toContain("access-1");
    expect(decrypt(r.accessTokenEnc!)).toBe("access-1");
    expect(decrypt(r.refreshTokenEnc!)).toBe("refresh-1");
    expect(r).toMatchObject({ status: "connected", accountName: "Northbay", scopes: "a b" });
  });

  it("reconnecting the same account replaces tokens and keeps history", async () => {
    const id = await saveConnection(db, "u1", "youtube", tokens(), { externalId: "UC1", name: "Northbay" });
    await db.insert(schema.dailyStat).values({ connectionId: id, date: "2026-11-15", followers: 10 });
    await db.update(schema.connection).set({ status: "expired" }).where(eq(schema.connection.id, id));
    const again = await saveConnection(db, "u1", "youtube", tokens({ accessToken: "access-2" }), { externalId: "UC1", name: "Northbay" });
    expect(again).toBe(id);
    expect(decrypt((await row(id)).accessTokenEnc!)).toBe("access-2");
    expect((await row(id)).status).toBe("connected");
    expect(await db.select().from(schema.dailyStat)).toHaveLength(1);
  });

  it("connecting a different account on the same platform starts fresh", async () => {
    const id = await saveConnection(db, "u1", "youtube", tokens(), { externalId: "UC1", name: "Old" });
    await db.insert(schema.dailyStat).values({ connectionId: id, date: "2026-11-15", followers: 10 });
    await saveConnection(db, "u1", "youtube", tokens(), { externalId: "UC2", name: "New" });
    expect(await db.select().from(schema.dailyStat)).toHaveLength(0);
    expect((await db.select().from(schema.connection))[0].accountName).toBe("New");
  });
});

describe("listConnections", () => {
  it("lists every platform in order with the user's status", async () => {
    await saveConnection(db, "u1", "tiktok", tokens(), { externalId: "o1", name: "@northbay" });
    const list = await listConnections(db, "u1");
    expect(list.map((c) => c.id)).toEqual(["youtube", "facebook", "tiktok", "linkedin", "instagram", "x"]);
    expect(list.find((c) => c.id === "tiktok")).toMatchObject({ status: "connected", account: "@northbay", name: "TikTok" });
    expect(list.find((c) => c.id === "youtube")).toMatchObject({ status: "not-connected", account: "", mode: "live" });
    expect(list.find((c) => c.id === "x")?.mode).toBe("unavailable");
  });
});

describe("getAccessToken", () => {
  it("returns the stored token while it is fresh", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const id = await saveConnection(db, "u1", "youtube", tokens(), { externalId: "UC1", name: "N" });
    expect(await getAccessToken(db, id)).toBe("access-1");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refreshes a token about to expire and stores the new one", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ access_token: "access-2", expires_in: 3599 })));
    const id = await saveConnection(db, "u1", "youtube", tokens({ expiresAt: new Date(Date.now() + 60_000) }), { externalId: "UC1", name: "N" });
    expect(await getAccessToken(db, id)).toBe("access-2");
    const r = await row(id);
    expect(decrypt(r.accessTokenEnc!)).toBe("access-2");
    expect(decrypt(r.refreshTokenEnc!)).toBe("refresh-1");
    expect(r.tokenExpiresAt!.getTime()).toBeGreaterThan(Date.now() + 3500_000);
  });

  it("marks the connection expired when the platform refuses to refresh", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "invalid_grant" }, { status: 400 })));
    const id = await saveConnection(db, "u1", "youtube", tokens({ expiresAt: new Date(Date.now() - 1000) }), { externalId: "UC1", name: "N" });
    await expect(getAccessToken(db, id)).rejects.toBeInstanceOf(ReauthRequired);
    expect((await row(id)).status).toBe("expired");
    await expect(getAccessToken(db, id)).rejects.toBeInstanceOf(ReauthRequired);
  });

  it("keeps using a valid token when a refresh fails for a temporary reason", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })));
    const id = await saveConnection(db, "u1", "youtube", tokens({ expiresAt: new Date(Date.now() + 60_000) }), { externalId: "UC1", name: "N" });
    expect(await getAccessToken(db, id)).toBe("access-1");
    expect((await row(id)).status).toBe("connected");
  });

  it("expires tokens that cannot be refreshed once they lapse", async () => {
    vi.stubEnv("META_APP_ID", "id");
    vi.stubEnv("META_APP_SECRET", "secret");
    const id = await saveConnection(db, "u1", "facebook", tokens({ refreshToken: null, expiresAt: new Date(Date.now() - 1000) }), { externalId: "p1", name: "Page" });
    await expect(getAccessToken(db, id)).rejects.toBeInstanceOf(ReauthRequired);
    expect((await row(id)).status).toBe("expired");
  });
});

describe("disconnect", () => {
  it("revokes, then deletes the connection and its stats", async () => {
    const fetch = vi.fn(async () => new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const id = await saveConnection(db, "u1", "youtube", tokens(), { externalId: "UC1", name: "N" });
    await db.insert(schema.dailyStat).values({ connectionId: id, date: "2026-11-15", followers: 10 });
    expect(await disconnect(db, "u1", "youtube")).toBe(true);
    expect(String((fetch.mock.calls[0] as unknown[])[0])).toContain("oauth2.googleapis.com/revoke");
    expect(await db.select().from(schema.connection)).toHaveLength(0);
    expect(await db.select().from(schema.dailyStat)).toHaveLength(0);
  });

  it("still disconnects when the platform's revoke fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    await saveConnection(db, "u1", "youtube", tokens(), { externalId: "UC1", name: "N" });
    expect(await disconnect(db, "u1", "youtube")).toBe(true);
    expect(await db.select().from(schema.connection)).toHaveLength(0);
  });

  it("only touches the signed-in user's connection", async () => {
    await db.insert(schema.user).values({ id: "u2", name: "B", email: "b@example.com" });
    await saveConnection(db, "u2", "youtube", tokens(), { externalId: "UC9", name: "Theirs" });
    expect(await disconnect(db, "u1", "youtube")).toBe(false);
    expect(await db.select().from(schema.connection)).toHaveLength(1);
  });
});

describe("refreshExpiring", () => {
  it("refreshes soon-to-expire tokens and counts the ones needing reconnection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) =>
        String(init?.body).includes("refresh-bad") ? Response.json({ error: "invalid_grant" }, { status: 400 }) : Response.json({ access_token: "new", expires_in: 3599 }),
      ),
    );
    await db.insert(schema.user).values({ id: "u2", name: "B", email: "b@example.com" });
    const ok = await saveConnection(db, "u1", "youtube", tokens({ expiresAt: new Date(Date.now() + 1000) }), { externalId: "UC1", name: "N" });
    const bad = await saveConnection(db, "u2", "youtube", tokens({ refreshToken: "refresh-bad", expiresAt: new Date(Date.now() + 1000) }), { externalId: "UC2", name: "M" });
    expect(await refreshExpiring(db)).toEqual({ checked: 2, expired: 1, failed: 0 });
    expect(decrypt((await row(ok)).accessTokenEnc!)).toBe("new");
    expect((await row(bad)).status).toBe("expired");
  });
});
