import { describe, expect, it } from "vitest";
import {
  getAudience,
  getConnections,
  getLiveViewers,
  getOverview,
  getPlatform,
  getPlatforms,
  getPosts,
  getTopPosts,
} from "@/lib/data/api";
import { sortPosts } from "@/lib/data/sort";
import { RANGES } from "@/lib/data/types";

describe("sample data consistency", () => {
  it("total audience equals the sum of connected platforms", async () => {
    const [overview, platforms] = await Promise.all([getOverview(), getPlatforms()]);
    const sum = platforms.filter((p) => p.status === "connected").reduce((s, p) => s + p.followers, 0);
    expect(sum).toBe(248600);
    for (const r of RANGES) expect(overview.metrics[r].followers).toBe(sum);
  });

  it("follower growth per range equals the sum across platforms", async () => {
    const [overview, platforms] = await Promise.all([getOverview(), getPlatforms()]);
    for (const r of RANGES) {
      const sum = platforms.reduce((s, p) => s + p.followerGrowth[r], 0);
      expect(sum).toBe(overview.metrics[r].followerDelta);
    }
  });

  it("weekly growth bars add up to the 7-day follower gain", async () => {
    const overview = await getOverview();
    const sum = overview.weekGrowth.reduce((s, d) => s + d.value, 0);
    expect(sum).toBe(overview.metrics[7].followerDelta);
  });

  it("each platform trend ends at its follower count", async () => {
    for (const p of await getPlatforms()) {
      if (p.status !== "connected") continue;
      expect(p.trend).toHaveLength(31);
      expect(p.trend[30]).toBe(p.followers);
      expect(p.trend[0]).toBe(p.followers - p.followerGrowth[30]);
    }
  });

  it("live viewers stop at the current hour today", async () => {
    const live = await getLiveViewers();
    expect(live.today).toHaveLength(live.nowIndex + 1);
    expect(live.yesterday).toHaveLength(live.hours.length);
  });

  it("audience shares add up to 100", async () => {
    const a = await getAudience();
    expect(a.ages.reduce((s, x) => s + x.share, 0)).toBe(100);
    expect(a.countries.reduce((s, x) => s + x.share, 0)).toBe(100);
  });
});

describe("lookups", () => {
  it("returns null for an unknown platform", async () => {
    expect(await getPlatform("myspace")).toBeNull();
    expect((await getPlatform("youtube"))?.name).toBe("YouTube");
  });

  it("filters posts by platform", async () => {
    const posts = await getPosts({ platform: "youtube" });
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((p) => p.platform === "youtube")).toBe(true);
  });

  it("returns top posts by views", async () => {
    const top = await getTopPosts(3);
    expect(top.map((p) => p.views)).toEqual([284000, 96300, 71800]);
  });

  it("lists X as not connected", async () => {
    const c = await getConnections();
    expect(c.find((p) => p.id === "x")?.status).toBe("not-connected");
  });
});

describe("sortPosts", () => {
  const posts = [
    { id: "a", views: 10, engagement: 2, publishedAt: "2026-11-01" },
    { id: "b", views: 30, engagement: 1, publishedAt: "2026-11-03" },
    { id: "c", views: 20, engagement: 2, publishedAt: "2026-11-02" },
  ];

  it("sorts by views, highest first", () => {
    expect(sortPosts(posts, "views").map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts by engagement and keeps the original order for ties", () => {
    expect(sortPosts(posts, "engagement").map((p) => p.id)).toEqual(["a", "c", "b"]);
  });

  it("sorts by date, newest first", () => {
    expect(sortPosts(posts, "date").map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate the input", () => {
    sortPosts(posts, "views");
    expect(posts.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });
});

describe("postsInRange", () => {
  const posts = [
    { id: "a", publishedAt: "2026-11-15" },
    { id: "b", publishedAt: "2026-11-09" },
    { id: "c", publishedAt: "2026-11-08" },
    { id: "d", publishedAt: "2026-10-17" },
    { id: "e", publishedAt: "2026-10-16" },
  ];

  it("keeps posts from the last N days, counting today", async () => {
    const { postsInRange } = await import("@/lib/data/sort");
    expect(postsInRange(posts, 7, "2026-11-15").map((p) => p.id)).toEqual(["a", "b"]);
    expect(postsInRange(posts, 30, "2026-11-15").map((p) => p.id)).toEqual(["a", "b", "c", "d"]);
  });
});
