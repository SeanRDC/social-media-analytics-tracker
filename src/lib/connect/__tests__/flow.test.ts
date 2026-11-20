import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { decrypt, seal } from "@/lib/connect/crypto";
import { saveConnection } from "@/lib/connect/service";
import { beginConnect, CHOOSE_PATH, completeConnect, finishChoice, readChoice, safeReturnTo } from "@/lib/connect/flow";

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
  it("refreshes the Facebook connection when Instagram is connected through the same Page", async () => {
    vi.stubEnv("META_APP_ID", "id");
    vi.stubEnv("META_APP_SECRET", "secret");
    await saveConnection(db, "u1", "facebook", { accessToken: "old-page-token", refreshToken: null, expiresAt: null, scopes: null }, { externalId: "p1", name: "Northbay" });
    await db.update(schema.connection).set({ status: "expired", lastSyncError: "Facebook (190/492): …" });
    const replies = [
      { access_token: "short" },
      { access_token: "long", expires_in: 5184000 },
      { data: [{ id: "p1", name: "Northbay", access_token: "new-page-token", instagram_business_account: { id: "1784", username: "northbay" } }] },
    ];
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(replies.shift())));
    const s = start("instagram");
    const q = new URLSearchParams({ code: "c", state: s.url.searchParams.get("state")! });
    const { location } = await completeConnect({ platform: "instagram", query: q, cookie: s.cookie, userId: "u1", baseUrl: BASE, db });
    expect(location).toBe("/settings?connect=ok&platform=instagram");
    const rows = await db.select().from(schema.connection);
    const fb = rows.find((r) => r.platform === "facebook")!;
    expect(fb).toMatchObject({ status: "connected", lastSyncError: null, externalId: "p1" });
    expect(decrypt(fb.accessTokenEnc!)).toBe("new-page-token");
    expect(decrypt(rows.find((r) => r.platform === "instagram")!.accessTokenEnc!)).toBe("new-page-token");
  });

  it("leaves a sibling alone when it belongs to a different Page", async () => {
    vi.stubEnv("META_APP_ID", "id");
    vi.stubEnv("META_APP_SECRET", "secret");
    await saveConnection(db, "u1", "facebook", { accessToken: "other-token", refreshToken: null, expiresAt: null, scopes: null }, { externalId: "p9", name: "Other" });
    const replies = [{ access_token: "short" }, { access_token: "long" }, { data: [{ id: "p1", access_token: "new", instagram_business_account: { id: "1784" } }] }];
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(replies.shift())));
    const s = start("instagram");
    const q = new URLSearchParams({ code: "c", state: s.url.searchParams.get("state")! });
    await completeConnect({ platform: "instagram", query: q, cookie: s.cookie, userId: "u1", baseUrl: BASE, db });
    const fb = (await db.select().from(schema.connection)).find((r) => r.platform === "facebook")!;
    expect(decrypt(fb.accessTokenEnc!)).toBe("other-token");
  });

  it("sends Instagram back with no-account when no Page has a linked Professional account", async () => {
    vi.stubEnv("META_APP_ID", "id");
    vi.stubEnv("META_APP_SECRET", "secret");
    const replies = [{ access_token: "short" }, { access_token: "long", expires_in: 5184000 }, { data: [{ id: "p1", name: "Page", access_token: "pt" }] }];
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(replies.shift())));
    const s = start("instagram", "/onboarding/connect");
    expect(s.url.host).toBe("www.facebook.com");
    expect(s.url.searchParams.get("redirect_uri")).toBe(`${BASE}/api/connect/instagram/callback`);
    const q = new URLSearchParams({ code: "c", state: s.url.searchParams.get("state")! });
    const { location } = await completeConnect({ platform: "instagram", query: q, cookie: s.cookie, userId: "u1", baseUrl: BASE, db });
    expect(location).toBe("/onboarding/connect?connect=error&platform=instagram&reason=no-account");
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
  it("sends an unsupported platform back as unavailable without a cookie", () => {
    const r = beginConnect({ platform: "myspace", userId: "u1", returnTo: "/settings", baseUrl: BASE });
    expect(r).toEqual({ location: "/settings?connect=error&platform=myspace&reason=unavailable" });
  });
});

describe("choosing one of several Pages", () => {
  const pages = { data: [{ id: "p1", name: "Northbay Studio", access_token: "pt1" }, { id: "p2", name: "Northbay Rentals", access_token: "pt2" }] };
  const meta = () => {
    vi.stubEnv("META_APP_ID", "id");
    vi.stubEnv("META_APP_SECRET", "secret");
  };
  async function toChoice() {
    const replies = [{ access_token: "short" }, { access_token: "long", expires_in: 5184000 }, pages];
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(replies.shift())));
    const s = start("facebook");
    const q = new URLSearchParams({ code: "c", state: s.url.searchParams.get("state")! });
    return completeConnect({ platform: "facebook", query: q, cookie: s.cookie, userId: "u1", baseUrl: BASE, db });
  }

  it("asks which Page to track instead of taking the first", async () => {
    meta();
    const r = await toChoice();
    expect(r.location).toBe(CHOOSE_PATH);
    expect(readChoice(r.pick, "u1")).toEqual({ platform: "facebook", returnTo: "/settings", options: [{ externalId: "p1", name: "Northbay Studio" }, { externalId: "p2", name: "Northbay Rentals" }] });
    expect(await db.select().from(schema.connection)).toHaveLength(0);
  });

  it("connects the chosen Page with its own token", async () => {
    meta();
    const { pick } = await toChoice();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(pages)));
    const { location } = await finishChoice({ cookie: pick, userId: "u1", externalId: "p2", db });
    expect(location).toBe("/settings?connect=ok&platform=facebook");
    const [c] = await db.select().from(schema.connection);
    expect(c).toMatchObject({ platform: "facebook", externalId: "p2", accountName: "Northbay Rentals" });
    expect(decrypt(c.accessTokenEnc!)).toBe("pt2");
  });

  it("refuses a Page that wasn't offered, or a choice made from someone else's session", async () => {
    meta();
    const { pick } = await toChoice();
    expect((await finishChoice({ cookie: pick, userId: "u1", externalId: "p9", db })).location).toBe("/settings?connect=error&platform=facebook&reason=state");
    expect((await finishChoice({ cookie: pick, userId: "someone-else", externalId: "p1", db })).location).toContain("reason=state");
    expect(readChoice(pick, "someone-else")).toBeNull();
    expect(await db.select().from(schema.connection)).toHaveLength(0);
  });

  it("treats a missing or tampered choice as expired", async () => {
    expect(readChoice(undefined, "u1")).toBeNull();
    expect(readChoice("v1.bad.bad.bad", "u1")).toBeNull();
    expect((await finishChoice({ cookie: undefined, userId: "u1", externalId: "p1", db })).location).toContain("reason=state");
  });
});
