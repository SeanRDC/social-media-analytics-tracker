import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { evaluateAlerts } from "@/lib/alerts/evaluate";
import { getAlertSettings, runAlerts, setAlertSetting } from "@/lib/alerts/run";
import type { ConnectionData, Dataset, PostData } from "@/lib/data/compute";
import { savePushSubscription, sendPush } from "@/lib/push";

const sendNotification = vi.fn();
vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification: (...a: unknown[]) => sendNotification(...a) } }));

const ASOF = "2026-11-16";
const post = (id: string, published: string, views: number): PostData => ({
  id,
  platform: "youtube",
  title: id,
  kind: "video",
  publishedAt: new Date(`${published}T12:00:00Z`),
  thumbnailUrl: null,
  permalink: null,
  views,
  likes: 0,
  comments: 0,
  shares: 0,
  avgWatchSeconds: null,
});
const conn = (daily: [string, number, number, number][]): ConnectionData => ({
  platform: "youtube",
  account: "N",
  status: "connected",
  daily: daily.map(([date, followers, views, engagements]) => ({ date, followers, followersGained: 0, views, engagements })),
});

describe("evaluateAlerts", () => {
  it("flags a new post with twice the usual views", () => {
    const ds: Dataset = { connections: [conn([[ASOF, 500, 0, 0]])], posts: [post("old1", "2026-10-01", 1000), post("old2", "2026-10-10", 1200), post("old3", "2026-10-20", 800), post("new", "2026-11-15", 2500), post("meh", "2026-11-16", 1100)], audience: [] };
    const a = evaluateAlerts(ds, ASOF, []);
    expect(a.filter((x) => x.kind === "spike").map((x) => x.key)).toEqual(["new"]);
    expect(a[0]).toMatchObject({ url: "/content?post=new" });
    expect(a[0].body).toContain("2.5× your usual");
  });

  it("needs enough history before calling anything a spike", () => {
    const ds: Dataset = { connections: [conn([[ASOF, 500, 0, 0]])], posts: [post("old1", "2026-10-01", 10), post("new", "2026-11-15", 2500)], audience: [] };
    expect(evaluateAlerts(ds, ASOF, []).some((x) => x.kind === "spike")).toBe(false);
  });

  it("celebrates crossing each 10K once", () => {
    const ds: Dataset = { connections: [conn([["2026-11-15", 19_950, 0, 0], [ASOF, 20_010, 0, 0]])], posts: [], audience: [] };
    expect(evaluateAlerts(ds, ASOF, []).find((x) => x.kind === "milestone")).toMatchObject({ key: "youtube:20000", title: "20K on YouTube" });
    const below: Dataset = { connections: [conn([["2026-11-15", 9_000, 0, 0], [ASOF, 9_500, 0, 0]])], posts: [], audience: [] };
    expect(evaluateAlerts(below, ASOF, []).some((x) => x.kind === "milestone")).toBe(false);
  });

  it("notices engagement falling more than 20% week over week, keyed by week", () => {
    const days: [string, number, number, number][] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.UTC(2026, 10, 16 - i)).toISOString().slice(0, 10);
      days.push([d, 100, 1000, i >= 7 ? 100 : 50]);
    }
    const a = evaluateAlerts({ connections: [conn(days)], posts: [], audience: [] }, ASOF, []).find((x) => x.kind === "drop");
    expect(a).toMatchObject({ key: "week-of:2026-11-16" });
    expect(a?.body).toContain("from 10.0% to 5.0%");
  });

  it("asks to reconnect expired platforms even with nothing imported", () => {
    expect(evaluateAlerts(null, null, [{ platform: "tiktok", since: "2026-11-15" }])).toEqual([expect.objectContaining({ kind: "reconnect", key: "tiktok:2026-11-15", url: "/settings" })]);
  });
});

describe("runAlerts", () => {
  let db: Db;
  beforeAll(async () => {
    const pg = drizzle(new PGlite(), { schema, casing: "snake_case" });
    await migrate(pg, { migrationsFolder: "drizzle" });
    db = pg as unknown as Db;
  }, 30_000);
  beforeEach(async () => {
    await db.delete(schema.user);
    await db.insert(schema.user).values({ id: "u1", name: "A", email: "a@example.com" });
    await db.insert(schema.connection).values({ userId: "u1", platform: "tiktok", externalId: "o1", accountName: "@me", status: "expired" });
    vi.spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    sendNotification.mockReset();
  });

  it("sends each alert once, by email", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    expect(await runAlerts(db)).toEqual({ sent: 1, failed: 0 });
    expect(log.mock.calls.flat().join("\n")).toContain("TikTok needs reconnecting");
    expect(await runAlerts(db)).toEqual({ sent: 0, failed: 0 });
  });

  it("respects alerts that are switched off", async () => {
    await setAlertSetting(db, "u1", "reconnect", false);
    expect((await getAlertSettings("u1", db)).reconnect).toBe(false);
    expect(await runAlerts(db)).toEqual({ sent: 0, failed: 0 });
  });

  it("pushes to subscribed devices and forgets ones the push service no longer knows", async () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "pub");
    vi.stubEnv("VAPID_PRIVATE_KEY", "priv");
    await savePushSubscription(db, "u1", { endpoint: "https://push.example/a", keys: { p256dh: "k", auth: "a" } });
    await savePushSubscription(db, "u1", { endpoint: "https://push.example/gone", keys: { p256dh: "k", auth: "a" } });
    sendNotification.mockImplementation(async (sub: { endpoint: string }) => {
      if (sub.endpoint.endsWith("gone")) throw Object.assign(new Error("Gone"), { statusCode: 410 });
    });
    expect(await sendPush(db, "u1", { title: "t", body: "b", url: "/" })).toBe(1);
    expect((await db.select().from(schema.pushSubscription)).map((s) => s.endpoint)).toEqual(["https://push.example/a"]);
  });

  it("sends nothing by push when VAPID keys are not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
    await savePushSubscription(db, "u1", { endpoint: "https://push.example/a", keys: { p256dh: "k", auth: "a" } });
    expect(await sendPush(db, "u1", { title: "t", body: "b", url: "/" })).toBe(0);
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
