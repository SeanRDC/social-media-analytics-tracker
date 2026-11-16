import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { seal } from "@/lib/connect/crypto";
import { beginConnect, completeConnect, safeReturnTo } from "@/lib/connect/flow";

const BASE = "http://localhost:3000";
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

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** Follows the authorize URL the way the platform would, returning the callback query. */
function start(platform: string, returnTo: string | null = "/settings") {
  const r = beginConnect({ platform, userId: "u1", returnTo, baseUrl: BASE });
  return { ...r, url: new URL(r.location) };
}

describe("safeReturnTo", () => {
  it.each([
    ["/settings", "/settings"],
    ["/onboarding/connect", "/onboarding/connect"],
    ["//evil.example", "/onboarding/connect"],
    ["https://evil.example/settings", "/onboarding/connect"],
    ["/settings/../admin", "/onboarding/connect"],
    [null, "/onboarding/connect"],
  ])("%s → %s", (input, out) => expect(safeReturnTo(input)).toBe(out));
});

describe("simulated round trip", () => {
  it("connects and returns to where the person started", async () => {
    const s = start("tiktok");
    expect(s.url.pathname).toBe("/api/connect/tiktok/callback");
    const { location } = await completeConnect({ platform: "tiktok", query: s.url.searchParams, cookie: s.cookie, userId: "u1", baseUrl: BASE, db });
    expect(location).toBe("/settings?connect=ok&platform=tiktok");
    const [c] = await db.select().from(schema.connection);
    expect(c).toMatchObject({ platform: "tiktok", externalId: "simulated:tiktok", status: "connected" });
  });

  it("rejects a callback without the state cookie", async () => {
    const s = start("tiktok");
    const { location } = await completeConnect({ platform: "tiktok", query: s.url.searchParams, cookie: undefined, userId: "u1", baseUrl: BASE, db });
    expect(location).toBe("/onboarding/connect?connect=error&platform=tiktok&reason=state");
    expect(await db.select().from(schema.connection)).toHaveLength(0);
  });

  it("rejects a state cookie that belongs to someone else", async () => {
    const s = start("tiktok");
    await db.insert(schema.user).values({ id: "u2", name: "B", email: "b@example.com" });
    const { location } = await completeConnect({ platform: "tiktok", query: s.url.searchParams, cookie: s.cookie, userId: "u2", baseUrl: BASE, db });
    expect(location).toContain("reason=state");
  });

  it("rejects a state cookie for another platform", async () => {
    const s = start("tiktok");
    const { location } = await completeConnect({ platform: "youtube", query: s.url.searchParams, cookie: s.cookie, userId: "u1", baseUrl: BASE, db });
    expect(location).toContain("reason=state");
  });

  it("rejects a mismatched state value", async () => {
    const s = start("tiktok");
    const q = new URLSearchParams(s.url.searchParams);
    q.set("state", "forged");
    const { location } = await completeConnect({ platform: "tiktok", query: q, cookie: s.cookie, userId: "u1", baseUrl: BASE, db });
    expect(location).toContain("reason=state");
  });

  it("rejects an expired state cookie", async () => {
    const cookie = seal({ state: "s", verifier: "", platform: "tiktok", userId: "u1", returnTo: "/settings" }, -1);
    const { location } = await completeConnect({ platform: "tiktok", query: new URLSearchParams({ code: "c", state: "s" }), cookie, userId: "u1", baseUrl: BASE, db });
    expect(location).toContain("reason=state");
  });

  it("reports a cancelled approval calmly", async () => {
    const s = start("tiktok");
    const q = new URLSearchParams({ error: "access_denied", state: s.url.searchParams.get("state")! });
    const { location } = await completeConnect({ platform: "tiktok", query: q, cookie: s.cookie, userId: "u1", baseUrl: BASE, db });
    expect(location).toBe("/settings?connect=error&platform=tiktok&reason=denied");
  });
});

describe("live providers", () => {
  it("sends Instagram personal accounts back with needs-professional", async () => {
    vi.stubEnv("INSTAGRAM_APP_ID", "id");
    vi.stubEnv("INSTAGRAM_APP_SECRET", "secret");
    const replies = [{ access_token: "short", user_id: 1 }, { access_token: "long", expires_in: 5184000 }, { user_id: "1", username: "me", account_type: "PERSONAL" }];
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(replies.shift())));
    const s = start("instagram", "/onboarding/connect");
    expect(s.url.host).toBe("www.instagram.com");
    expect(s.url.searchParams.get("redirect_uri")).toBe(`${BASE}/api/connect/instagram/callback`);
    const q = new URLSearchParams({ code: "c", state: s.url.searchParams.get("state")! });
    const { location } = await completeConnect({ platform: "instagram", query: q, cookie: s.cookie, userId: "u1", baseUrl: BASE, db });
    expect(location).toBe("/onboarding/connect?connect=error&platform=instagram&reason=needs-professional");
    expect(await db.select().from(schema.connection)).toHaveLength(0);
  });

  it("sends the PKCE verifier to Google", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    const bodies: string[] = [];
    const replies = [{ access_token: "at", refresh_token: "rt", expires_in: 3599 }, { items: [{ id: "UC1", snippet: { title: "Northbay" } }] }];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init?: RequestInit) => {
        bodies.push(String(init?.body ?? ""));
        return Response.json(replies.shift());
      }),
    );
    const s = start("youtube");
    const q = new URLSearchParams({ code: "c", state: s.url.searchParams.get("state")! });
    const { location } = await completeConnect({ platform: "youtube", query: q, cookie: s.cookie, userId: "u1", baseUrl: BASE, db });
    expect(location).toBe("/settings?connect=ok&platform=youtube");
    expect(bodies[0]).toMatch(/code_verifier=[\w-]{43}/);
  });

  it("reports a platform failure without crashing", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 502 })));
    const s = start("youtube");
    const q = new URLSearchParams({ code: "c", state: s.url.searchParams.get("state")! });
    const { location } = await completeConnect({ platform: "youtube", query: q, cookie: s.cookie, userId: "u1", baseUrl: BASE, db });
    expect(location).toContain("reason=failed");
  });
});

describe("unavailable platforms", () => {
  it("sends X back as unavailable without a cookie", () => {
    const r = beginConnect({ platform: "x", userId: "u1", returnTo: "/settings", baseUrl: BASE });
    expect(r).toEqual({ location: "/settings?connect=error&platform=x&reason=unavailable" });
  });
});
