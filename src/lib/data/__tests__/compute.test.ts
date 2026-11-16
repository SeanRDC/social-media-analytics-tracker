import { describe, expect, it } from "vitest";
import {
  asOfDate,
  bestTimes,
  computeAudience,
  computeDailyViews,
  computeOverview,
  computePlatforms,
  computePosts,
  daysEnding,
  roundTo100,
  type Dataset,
  type PostData,
} from "@/lib/data/compute";
import { RANGES, type PlatformId } from "@/lib/data/types";
import { simulatedSnapshot } from "@/lib/sync/simulated";

const W = { start: "2026-05-21", end: "2026-11-15" };

/** A dataset built the way the sync stores it, from generated history. */
function dataset(platforms: PlatformId[]): Dataset {
  const ds: Dataset = { connections: [], posts: [], audience: [] };
  for (const platform of platforms) {
    const s = simulatedSnapshot(platform, W);
    ds.connections.push({ platform, account: `Sample ${platform}`, status: "connected", daily: s.daily });
    ds.posts.push(...s.posts.map((p) => ({ ...p, id: p.externalId, platform })));
    ds.audience.push(...(s.audience ?? []).map((a) => ({ ...a, platform })));
  }
  return ds;
}

describe("with imported history", () => {
  const ds = dataset(["youtube", "tiktok"]);
  const asOf = asOfDate(ds)!;
  const overview = computeOverview(ds, asOf);
  const platforms = computePlatforms(ds, asOf);
  const daily = computeDailyViews(ds, asOf);

  it("is as of the latest stored day", () => {
    expect(asOf).toBe("2026-11-15");
    expect(overview.trendStart).toBe("2026-10-16");
  });

  it("total audience equals the sum of connected platforms", () => {
    const sum = platforms.filter((p) => p.status === "connected").reduce((s, p) => s + p.followers, 0);
    for (const r of RANGES) expect(overview.metrics[r].followers).toBe(sum);
    expect(overview.trend[30]).toBe(sum);
  });

  it("follower growth per range equals the sum across platforms", () => {
    for (const r of RANGES) expect(platforms.reduce((s, p) => s + p.followerGrowth[r], 0)).toBe(overview.metrics[r].followerDelta);
  });

  it("weekly growth bars add up to the 7-day follower gain", () => {
    expect(overview.weekGrowth.map((d) => d.day)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(overview.weekGrowth.reduce((s, d) => s + d.value, 0)).toBe(overview.metrics[7].followerDelta);
  });

  it("each platform trend ends at its follower count", () => {
    for (const p of platforms.filter((x) => x.status === "connected")) {
      expect(p.trend).toHaveLength(31);
      expect(p.trend[30]).toBe(p.followers);
      expect(p.trend[0]).toBe(p.followers - p.followerGrowth[30]);
    }
  });

  it("daily views add up to the 7-day views and match the week-over-week change", () => {
    const thisWeek = daily.thisWeek.reduce((s, v) => s + v, 0);
    const lastWeek = daily.lastWeek.reduce((s, v) => s + v, 0);
    expect(daily.todayIndex).toBe(6);
    expect(thisWeek).toBe(overview.metrics[7].views);
    expect(Math.round((thisWeek / lastWeek - 1) * 100)).toBe(overview.metrics[7].viewsChange);
  });

  it("picks the platform with the most followers as top", () => {
    const top = [...platforms].sort((a, b) => b.followers - a.followers)[0];
    expect(overview.topPlatform).toBe(top.id);
    expect(overview.connectedCount).toBe(2);
    expect(overview.accountName).toBe(top.account);
  });

  it("lists platforms that are not connected with zeros", () => {
    const x = platforms.find((p) => p.id === "x")!;
    expect(x).toMatchObject({ status: "not-connected", followers: 0, trend: [] });
    expect(platforms.find((p) => p.id === "youtube")?.followerNoun).toBe("subscribers");
  });

  it("audience shares add up to 100 and name their sources", () => {
    const a = computeAudience(ds, asOf);
    expect(a.sources).toEqual(["youtube"]);
    expect(a.ages.reduce((s, x) => s + x.share, 0)).toBe(100);
    expect(a.countries.reduce((s, x) => s + x.share, 0)).toBe(100);
    expect(a.countries[0].name).toBe("United States");
    expect(a.countries.at(-1)?.name).toBe("Other");
    expect(a.bestTimes).toHaveLength(7);
    expect(Math.max(...a.bestTimes.flatMap((d) => d.slots))).toBe(1);
  });

  it("turns posts into the contract with engagement and links", () => {
    const [p] = computePosts({ ...ds, posts: [{ ...ds.posts[0], views: 1000, likes: 40, comments: 6, shares: 4, thumbnailUrl: "https://x/y.jpg", permalink: "https://x" }] });
    expect(p).toMatchObject({ engagement: 5, thumbnailUrl: "https://x/y.jpg", permalink: "https://x", thumb: "a" });
    expect(p.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("edge cases", () => {
  it("fills gaps by carrying followers forward", () => {
    const c = {
      platform: "youtube" as const,
      account: "",
      status: "connected" as const,
      daily: [
        { date: "2026-11-10", followers: 100, followersGained: 1, views: 5, engagements: 1 },
        { date: "2026-11-13", followers: 104, followersGained: 4, views: 9, engagements: 1 },
      ],
    };
    expect(daysEnding(c, "2026-11-14", 5).map((d) => d.followers)).toEqual([100, 100, 100, 104, 104]);
    expect(daysEnding(c, "2026-11-14", 5).map((d) => d.views)).toEqual([5, 0, 0, 9, 0]);
  });

  it("handles a channel with no views, posts or demographics", () => {
    const ds: Dataset = {
      connections: [{ platform: "youtube", account: "New channel", status: "connected", daily: [{ date: "2026-11-15", followers: 3, followersGained: 0, views: 0, engagements: 0 }] }],
      posts: [],
      audience: [],
    };
    const o = computeOverview(ds, "2026-11-15");
    expect(o.metrics[30]).toMatchObject({ followers: 3, views: 0, viewsChange: 0, engagement: 0, engagementChange: 0, posts: 0 });
    expect(computeDailyViews(ds, "2026-11-15").thisWeek).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(computeAudience(ds, "2026-11-15")).toMatchObject({ sources: [], ages: [], countries: [] });
  });

  it("leaves out expired connections from totals but still lists them", () => {
    const ds = dataset(["youtube", "tiktok"]);
    ds.connections[1].status = "expired";
    const asOf = asOfDate(ds)!;
    const yt = computePlatforms(ds, asOf).find((p) => p.id === "youtube")!;
    expect(computeOverview(ds, asOf).metrics[7].followers).toBe(yt.followers);
    expect(computePlatforms(ds, asOf).find((p) => p.id === "tiktok")?.status).toBe("expired");
  });

  it("rounds shares to exactly 100", () => {
    expect(roundTo100([1, 1, 1])).toEqual([34, 33, 33]);
    expect(roundTo100([0, 0])).toEqual([0, 0]);
  });

  it("scores best times by average views per slot", () => {
    const post = (iso: string, views: number) => ({ publishedAt: new Date(iso), views }) as PostData;
    const t = bestTimes([post("2026-11-12T18:00:00Z", 900), post("2026-11-12T19:00:00Z", 100), post("2026-11-16T08:00:00Z", 250)]);
    expect(t[3]).toEqual({ day: "Thu", slots: [0, 0, 1, 0] });
    expect(t[0].slots[0]).toBe(0.5);
  });
});
