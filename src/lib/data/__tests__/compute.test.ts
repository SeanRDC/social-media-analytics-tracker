import { describe, expect, it } from "vitest";
import {
  asOfDate,
  computeAudience,
  computeDailyViews,
  computeOverview,
  computePlatforms,
  computePosts,
  daysEnding,
  onlineTimes,
  placeInWeek,
  postingTimes,
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
    ds.posts.push(...s.posts.map((p) => ({ ...p, id: p.externalId, platform, views7d: null })));
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
    const sum = platforms.filter((p) => p.status === "connected").reduce((s, p) => s + p.followers!, 0);
    for (const r of RANGES) expect(overview.metrics[r].followers).toBe(sum);
    expect(overview.trend[30]).toBe(sum);
  });

  it("follower growth per range equals the sum across platforms", () => {
    for (const r of RANGES) expect(platforms.reduce((s, p) => s + p.followerGrowth[r]!, 0)).toBe(overview.metrics[r].followerDelta);
  });

  it("weekly growth bars add up to the 7-day follower gain", () => {
    expect(overview.weekGrowth.map((d) => d.day)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(overview.weekGrowth.reduce((s, d) => s + d.value!, 0)).toBe(overview.metrics[7].followerDelta);
  });

  it("each platform trend ends at its follower count", () => {
    for (const p of platforms.filter((x) => x.status === "connected")) {
      expect(p.trend).toHaveLength(31);
      expect(p.trend[30]).toBe(p.followers);
      expect(p.trend[0]).toBe(p.followers! - p.followerGrowth[30]!);
    }
  });

  it("daily views add up to the 7-day views and match the week-over-week change", () => {
    const thisWeek = daily.thisWeek.reduce((s: number, v) => s + v!, 0);
    const lastWeek = daily.lastWeek.reduce((s: number, v) => s + v!, 0);
    expect(daily.todayIndex).toBe(6);
    expect(thisWeek).toBe(overview.metrics[7].views);
    expect(Math.round((thisWeek / lastWeek - 1) * 100)).toBe(overview.metrics[7].viewsChange);
  });

  it("splits this week's daily views by platform, adding up to the daily total", () => {
    expect(daily.byPlatform.map((p) => p.platform)).toEqual(["youtube", "tiktok"]);
    daily.thisWeek.forEach((total, i) => expect(daily.byPlatform.reduce((s, p) => s + p.thisWeek[i]!, 0)).toBe(total));
  });

  it("picks the platform with the most followers as top", () => {
    const top = [...platforms].sort((a, b) => b.followers! - a.followers!)[0];
    expect(overview.topPlatform).toBe(top.id);
    expect(overview.connectedCount).toBe(2);
    expect(overview.accountName).toBe(top.account);
  });

  it("lists platforms that are not connected with no numbers rather than zeros", () => {
    const notConnected = platforms.find((p) => p.id === "facebook")!;
    expect(notConnected).toMatchObject({ status: "not-connected", followers: null, views30: null, engagement: null, followerGrowth: { 7: null, 30: null, 90: null }, trend: [] });
    expect(platforms.find((p) => p.id === "youtube")?.followerNoun).toBe("subscribers");
  });

  it("audience shares add up to 100 and name their sources", () => {
    const a = computeAudience(ds, asOf);
    expect(a.sources).toEqual(["youtube"]);
    expect(a.ages.reduce((s, x) => s + x.share, 0)).toBe(100);
    expect(a.countries.reduce((s, x) => s + x.share, 0)).toBe(100);
    expect(a.countries[0].name).toBe("United States");
    expect(a.countries.at(-1)?.name).toBe("Other");
    expect(a.posting.all.days).toHaveLength(7);
    expect(a.slots.map((x) => x.label)).toEqual(["Morning", "Midday", "Evening", "Night"]);
    // no first-week readings in a single import: everything is waiting or left out, nothing is made up
    expect(a.posting.all.used).toBe(0);
    expect(a.posting.all.days.flatMap((d) => d.cells).every((c) => c.score === null)).toBe(true);
  });

  it("turns posts into the contract with engagement and links", () => {
    const [p] = computePosts({ ...ds, posts: [{ ...ds.posts[0], views: 1000, likes: 40, comments: 6, shares: 4, thumbnailUrl: "https://x/y.jpg", permalink: "https://x" }] });
    expect(p).toMatchObject({ engagement: 5, thumbnailUrl: "https://x/y.jpg", permalink: "https://x", thumb: "a" });
    expect(p.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("edge cases", () => {
  it("leaves days the platform did not report empty, never zero or carried over", () => {
    const c = {
      platform: "youtube" as const,
      account: "",
      status: "connected" as const,
      daily: [
        { date: "2026-11-10", followers: 100, followersGained: 1, views: 5, engagements: 1 },
        { date: "2026-11-13", followers: 104, followersGained: 4, views: 9, engagements: 1 },
      ],
    };
    expect(daysEnding(c, "2026-11-14", 5).map((d) => d.followers)).toEqual([100, null, null, 104, null]);
    expect(daysEnding(c, "2026-11-14", 5).map((d) => d.views)).toEqual([5, null, null, 9, null]);
  });

  it("adds up only reported days and says from when the period is covered", () => {
    const ds: Dataset = {
      connections: [{ platform: "youtube", account: "New channel", status: "connected", daily: [{ date: "2026-11-15", followers: 3, followersGained: 0, views: 0, engagements: 0 }] }],
      posts: [],
      audience: [],
    };
    const o = computeOverview(ds, "2026-11-15");
    // a reported zero is a real zero; the change needs both periods fully reported, so it is unknown
    expect(o.metrics[30]).toMatchObject({ followers: 3, views: 0, viewsChange: null, engagement: 0, engagementChange: null, posts: 0, dataSince: "2026-11-15" });
    expect(computeDailyViews(ds, "2026-11-15").thisWeek).toEqual([null, null, null, null, null, null, 0]);
    expect(computeAudience(ds, "2026-11-15")).toMatchObject({ sources: [], ages: [], countries: [] });
  });

  it("shows no views or engagement for a platform that has only reported its follower total", () => {
    const ds: Dataset = {
      connections: [{ platform: "tiktok", account: "@me", status: "connected", daily: [{ date: "2026-11-15", followers: 7, followersGained: null, views: null, engagements: null }] }],
      posts: [],
      audience: [],
    };
    const tiktok = computePlatforms(ds, "2026-11-15").find((p) => p.id === "tiktok")!;
    expect(tiktok).toMatchObject({ followers: 7, views30: null, engagement: null, followerGrowth: { 7: null, 30: null, 90: null } });
    expect(computeOverview(ds, "2026-11-15").metrics[7]).toMatchObject({ followers: 7, followerDelta: null, views: null, viewsChange: null, engagement: null });
  });

  it("keeps a reported platform's numbers when another platform has not reported yet", () => {
    const ds = dataset(["youtube"]);
    const asOf = asOfDate(ds)!;
    const alone = computeOverview(ds, asOf).metrics[30];
    ds.connections.push({ platform: "tiktok", account: "@me", status: "connected", daily: [{ date: asOf, followers: 7, followersGained: null, views: null, engagements: null }] });
    const both = computeOverview(ds, asOf).metrics[30];
    expect(both.views).toBe(alone.views);
    expect(both.followers).toBe(alone.followers! + 7);
    // TikTok did not report the period, so a fair comparison with the last one is not possible
    expect(both.viewsChange).toBeNull();
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

});

describe("best time to post", () => {
  const ASOF = "2026-11-30";
  let n = 0;
  const post = (iso: string, views7d: number | null, platform: PlatformId = "youtube", views = 10 * (views7d ?? 1)): PostData => ({
    id: `p${n++}`,
    platform,
    title: "",
    kind: "video",
    publishedAt: new Date(iso),
    thumbnailUrl: null,
    permalink: null,
    views,
    likes: 0,
    comments: 0,
    shares: 0,
    avgWatchSeconds: null,
    views7d,
  });
  // Thursday 2026-11-12 18:00 UTC is Thursday evening; Monday 2026-11-09 08:00 UTC is Monday morning
  const thuEvening = (v: number, p?: PlatformId) => post("2026-11-12T18:00:00Z", v, p);
  const monMorning = (v: number, p?: PlatformId) => post("2026-11-09T08:00:00Z", v, p);
  const cell = (t: ReturnType<typeof postingTimes>["all"], day: number, slot: number) => t.days[day].cells[slot];

  it("places moments by the person's clock, the small hours belonging to the night before", () => {
    const place = placeInWeek("UTC");
    expect(place(new Date("2026-11-10T01:00:00Z"))).toEqual({ day: 0, slot: 3 }); // 1 a.m. Tuesday is Monday night
    expect(place(new Date("2026-11-09T05:00:00Z"))).toEqual({ day: 0, slot: 0 });
    expect(place(new Date("2026-11-09T11:00:00Z"))).toEqual({ day: 0, slot: 1 });
    expect(place(new Date("2026-11-09T16:00:00Z"))).toEqual({ day: 0, slot: 2 });
    expect(place(new Date("2026-11-09T20:00:00Z"))).toEqual({ day: 0, slot: 3 });
    // Wednesday 22:00 UTC is Thursday 6 a.m. in Manila (UTC+8)
    expect(placeInWeek("Asia/Manila")(new Date("2026-11-11T22:00:00Z"))).toEqual({ day: 3, slot: 0 });
  });

  it("gives no score until a time has enough posts, instead of a misleading 0% or 100%", () => {
    const t = postingTimes([thuEvening(500), thuEvening(600), monMorning(100), monMorning(120), monMorning(110)], ASOF).all;
    expect(cell(t, 3, 2)).toEqual({ score: null, posts: 2 });
    expect(cell(t, 0, 0).score).not.toBeNull();
    expect(cell(t, 5, 1)).toEqual({ score: null, posts: 0 });
  });

  it("uses the median, so one viral post can't carry a time", () => {
    const posts = [monMorning(100), monMorning(100), monMorning(100_000), thuEvening(300), thuEvening(300), thuEvening(300)];
    const t = postingTimes(posts, ASOF).all;
    expect(cell(t, 3, 2).score!).toBeGreaterThan(cell(t, 0, 0).score!);
  });

  it("scores each post against its own platform, so a big platform doesn't drown out a small one", () => {
    // YouTube's Monday mornings are typical; TikTok's Thursday evenings are 3× TikTok's usual
    const posts = [
      ...[1, 2, 3].map(() => monMorning(50_000, "youtube")),
      ...[1, 2, 3].map(() => post("2026-11-13T09:00:00Z", 50_000, "youtube")),
      ...[1, 2, 3].map(() => thuEvening(900, "tiktok")),
      ...[1, 2, 3, 4, 5, 6].map(() => post("2026-11-14T13:00:00Z", 300, "tiktok")),
    ];
    const { all, platforms } = postingTimes(posts, ASOF);
    expect(cell(all, 3, 2).score).toBe(3);
    expect(cell(all, 0, 0).score).toBe(1);
    expect(platforms.map((p) => p.id)).toEqual(["youtube", "tiktok"]);
    expect(cell(platforms[1].times, 3, 2).score).toBe(3);
    expect(cell(platforms[0].times, 3, 2)).toEqual({ score: null, posts: 0 });
  });

  it("only compares posts at the same age, and says which were left out and why", () => {
    const posts = [
      thuEvening(400),
      post("2026-11-28T10:00:00Z", null), // two days old: waiting for its week
      post("2026-06-01T10:00:00Z", null, "youtube", 9_000_000), // imported long after its first week
    ];
    const t = postingTimes(posts, ASOF).all;
    expect(t.used).toBe(1);
    expect(t.waiting).toBe(1);
    expect(t.untracked).toBe(1);
    // the old post's big lifetime total plays no part
    expect(t.days.flatMap((d) => d.cells).reduce((s, c) => s + c.posts, 0)).toBe(1);
  });

  it("still names the best day and the best time of day while single cells are too thin", () => {
    // three evening posts on three different days: no cell has 3, the evening window does
    const posts = ["2026-11-09T17:00:00Z", "2026-11-10T17:00:00Z", "2026-11-11T17:00:00Z"].map((iso) => post(iso, 500));
    const t = postingTimes(posts, ASOF).all;
    expect(t.days.flatMap((d) => d.cells).every((c) => c.score === null)).toBe(true);
    expect(t.bySlot[2]).toEqual({ score: 1, posts: 3 });
    expect(t.byDay[0]).toEqual({ score: null, posts: 1 });
  });
});

describe("followers online", () => {
  const hour = (iso: string, followers: number) => ({ platform: "instagram" as const, hourStart: new Date(iso), followers });

  it("averages the hourly counts in each window, in the person's time zone", () => {
    const t = onlineTimes([hour("2026-11-09T17:00:00Z", 400), hour("2026-11-09T18:00:00Z", 600), hour("2026-11-16T17:00:00Z", 800)], "UTC")!;
    expect(t.platform).toBe("instagram");
    expect(t.days[0].cells[2]).toBe(600); // Monday evening: (400 + 600 + 800) / 3
    expect(t.days[0].cells[0]).toBeNull(); // nothing reported: not zero
    expect(t.daysCovered).toBe(2);
  });

  it("is absent when no platform reports it", () => {
    expect(onlineTimes([], "UTC")).toBeNull();
  });
});

describe("period-over-period change", () => {
  const day = (date: string, views: number | null) => ({ date, followers: 10, followersGained: 0, views, engagements: views === null ? null : 1 });
  const days = (start: string, n: number, views: (i: number) => number | null) => Array.from({ length: n }, (_, i) => day(addDaysIso(start, i), views(i)));
  const addDaysIso = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

  it("compares the latest fully reported week when a platform reports a day late", () => {
    // Facebook reported through Nov 15; YouTube only through Nov 14 (its usual lag)
    const ds: Dataset = {
      connections: [
        { platform: "facebook", account: "", status: "connected", daily: days("2026-11-01", 15, (i) => (i < 7 ? 100 : 150)) },
        { platform: "youtube", account: "", status: "connected", daily: days("2026-11-01", 14, () => 50) },
      ],
      posts: [],
      audience: [],
    };
    const m = computeOverview(ds, "2026-11-15").metrics[7];
    // weeks Nov 8–14 vs Nov 1–7: (150*7 + 50*7) / (100*7 + 50*7) - 1 = +33%
    expect(m.viewsChange).toBe(33);
  });

  it("has no change when the earlier period was not fully reported", () => {
    const ds: Dataset = {
      connections: [{ platform: "facebook", account: "", status: "connected", daily: days("2026-11-10", 6, () => 100) }],
      posts: [],
      audience: [],
    };
    expect(computeOverview(ds, "2026-11-15").metrics[7].viewsChange).toBeNull();
  });
});

describe("post views", () => {
  const post = (id: string, publishedAt: string, views: number): PostData => ({
    id,
    platform: "tiktok",
    title: id,
    kind: "video",
    publishedAt: new Date(publishedAt),
    thumbnailUrl: null,
    permalink: null,
    views,
    likes: 0,
    comments: 0,
    shares: 0,
    avgWatchSeconds: null,
    views7d: null,
  });
  const ds: Dataset = {
    // TikTok has only reported its follower total so far: no daily views yet
    connections: [{ platform: "tiktok", account: "@me", status: "connected", daily: [{ date: "2026-11-19", followers: 7, followersGained: null, views: null, engagements: null }] }],
    posts: [post("a", "2026-11-18T10:00:00Z", 421), post("b", "2026-11-16T10:00:00Z", 589), post("c", "2026-09-01T10:00:00Z", 1000)],
    audience: [],
  };

  it("totals each post's reported views from the first import", () => {
    const t = computePlatforms(ds, "2026-11-19").find((p) => p.id === "tiktok")!;
    expect(t).toMatchObject({ postViews: 2010, postCount: 3, views30: null });
  });

  it("averages views per post over posts published in the last 30 days", () => {
    const t = computePlatforms(ds, "2026-11-19").find((p) => p.id === "tiktok")!;
    expect(t.viewsPerPost30).toBe(505);
  });

  it("has no average when nothing was published in the last 30 days", () => {
    const old = { ...ds, posts: [post("c", "2026-09-01T10:00:00Z", 1000)] };
    expect(computePlatforms(old, "2026-11-19").find((p) => p.id === "tiktok")!.viewsPerPost30).toBeNull();
  });
});
