import { afterEach, describe, expect, it, vi } from "vitest";
import { ReauthRequired } from "@/lib/connect/providers";
import { simulatedSnapshot } from "@/lib/sync/simulated";
import { audienceRows, dailyRows, fetchYouTube, firstWeekRange, parseDuration } from "@/lib/sync/youtube";

afterEach(() => vi.unstubAllGlobals());

const W = { start: "2026-11-10", end: "2026-11-12" };

/** Routes stubbed fetch calls by URL. */
function api(routes: Record<string, (url: URL) => { status?: number; body: unknown }>) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = new URL(input);
      calls.push(url.toString());
      const key = Object.keys(routes).find((k) => url.toString().includes(k));
      const r = key ? routes[key](url) : { status: 404, body: { error: { code: 404 } } };
      return Response.json(r.body, { status: r.status ?? 200 });
    }),
  );
  return calls;
}

const analytics = (url: URL) => {
  const dims = url.searchParams.get("dimensions");
  if (dims === "day")
    return {
      body: {
        columnHeaders: ["day", "views", "estimatedMinutesWatched", "subscribersGained", "subscribersLost", "likes", "comments", "shares"].map((name) => ({ name })),
        rows: [
          ["2026-11-10", 1000, 300, 12, 2, 40, 5, 3],
          ["2026-11-11", 1200, 360, 20, 5, 50, 6, 4],
          ["2026-11-12", 900, 250, 8, 3, 30, 2, 1],
        ],
      },
    };
  if (dims === "video") return { body: { columnHeaders: [{ name: "video" }, { name: "views" }, { name: "averageViewDuration" }, { name: "shares" }], rows: [["v1", 5000, 245, 17]] } };
  if (dims === "ageGroup,gender")
    return {
      body: {
        columnHeaders: [{ name: "ageGroup" }, { name: "gender" }, { name: "viewerPercentage" }],
        rows: [
          ["age25-34", "female", 30],
          ["age25-34", "male", 30],
          ["age55-64", "male", 40],
        ],
      },
    };
  return { status: 403, body: { error: { code: 403, message: "Forbidden" } } };
};

const channelRoutes = {
  "/channels": () => ({ body: { items: [{ statistics: { subscriberCount: "1000" }, contentDetails: { relatedPlaylists: { uploads: "UU1" } } }] } }),
  "/playlistItems": () => ({ body: { items: [{ contentDetails: { videoId: "v1" } }, { contentDetails: { videoId: "v2" } }] } }),
  "/videos": () => ({
    body: {
      items: [
        { id: "v1", snippet: { title: "Long one", publishedAt: "2026-11-11T15:00:00Z", thumbnails: { medium: { url: "https://i.ytimg.com/v1.jpg" } } }, statistics: { viewCount: "5000", likeCount: "200", commentCount: "30" }, contentDetails: { duration: "PT12M3S" } },
        { id: "v2", snippet: { title: "Quick tip", publishedAt: "2026-11-01T09:00:00Z" }, statistics: { viewCount: "800" }, contentDetails: { duration: "PT2M50S" } },
      ],
    },
  }),
  youtubeanalytics: analytics,
};

describe("fetchYouTube", () => {
  it("builds daily rows, posts and audience from both APIs", async () => {
    api(channelRoutes);
    const snap = await fetchYouTube("token", W, { externalId: "UC1", maxPosts: 200 });
    expect(snap.followers).toBe(1000);
    // followers rebuilt backwards: 1000 on the last day, minus each later day's net gain
    expect(snap.daily.map((d) => d.followers)).toEqual([980, 995, 1000]);
    expect(snap.daily.map((d) => d.followersGained)).toEqual([10, 15, 5]);
    expect(snap.daily[1]).toMatchObject({ views: 1200, engagements: 60, posts: 1, watchMinutes: 360 });

    const [long, short] = snap.posts;
    expect(long).toMatchObject({ externalId: "v1", kind: "video", views: 5000, likes: 200, comments: 30, shares: 17, avgWatchSeconds: 245, permalink: "https://www.youtube.com/watch?v=v1" });
    expect(long.thumbnailUrl).toBe("https://i.ytimg.com/v1.jpg");
    expect(short).toMatchObject({ kind: "short", likes: 0, avgWatchSeconds: null });

    // country report refused (403): ages still stored
    expect(snap.audience).toEqual(
      expect.arrayContaining([
        { dimension: "age", key: "25–34", share: 60 },
        { dimension: "age", key: "45+", share: 40 },
        { dimension: "gender", key: "male", share: 70 },
      ]),
    );
  });

  it("asks to reconnect when Google rejects the token", async () => {
    api({ "/channels": () => ({ status: 401, body: { error: { code: 401 } } }) });
    await expect(fetchYouTube("token", W, { externalId: "UC1", maxPosts: 200 })).rejects.toBeInstanceOf(ReauthRequired);
  });

  it("handles a channel without uploads", async () => {
    api({ ...channelRoutes, "/channels": () => ({ body: { items: [{ statistics: { subscriberCount: "3" }, contentDetails: { relatedPlaylists: {} } }] } }) });
    const snap = await fetchYouTube("token", W, { externalId: "UC1", maxPosts: 200 });
    expect(snap.posts).toEqual([]);
    expect(snap.daily).toHaveLength(3);
  });
});

describe("first-week views", () => {
  const DAY = 86_400_000;

  it("ends each video's window at the Pacific midnight nearest to exactly 7 days old", () => {
    // 09:00 PST: stop at the 7th midnight; 20:30 PST: at the 8th
    expect(firstWeekRange(new Date("2026-11-10T17:00:00Z"))).toEqual({ start: "2026-11-10", end: "2026-11-16" });
    expect(firstWeekRange(new Date("2026-11-11T04:30:00Z"))).toEqual({ start: "2026-11-10", end: "2026-11-17" });
  });

  it("measures every upload hour within half a day of the same age", () => {
    for (let m = 0; m < 24 * 60; m += 30) {
      const published = new Date(Date.parse("2026-11-10T08:00:00Z") + m * 60_000); // through one PST day
      const { end } = firstWeekRange(published);
      const windowEnd = Date.parse(`${end}T00:00:00-08:00`) + DAY;
      expect(Math.abs(windowEnd - published.getTime() - 7 * DAY)).toBeLessThanOrEqual(DAY / 2);
    }
  });

  /** Analytics answering per-video first-week requests with `views`, or a status. */
  const withFirstWeeks = (answer: (id: string) => { status?: number; views?: number }) => ({
    ...channelRoutes,
    youtubeanalytics: (url: URL) => {
      const f = url.searchParams.get("filters");
      if (!f?.startsWith("video==")) return analytics(url);
      const a = answer(f.slice(7));
      if (a.status) return { status: a.status, body: { error: { code: a.status } } };
      return { body: { columnHeaders: [{ name: "views" }], rows: a.views === undefined ? [] : [[a.views]] } };
    },
  });
  const firstWeekCalls = (calls: string[]) => calls.filter((c) => c.includes("filters=video")).map((c) => new URL(c).searchParams);

  it("reads a settled video's exact first-week views from Analytics", async () => {
    const calls = api(withFirstWeeks(() => ({ views: 1234 })));
    const snap = await fetchYouTube("token", W, { externalId: "UC1", maxPosts: 200 });
    // v1 went out on Nov 11: its first week isn't over (and settled) yet
    expect(snap.firstWeeks).toEqual([{ externalId: "v2", views: 1234 }]);
    const [q] = firstWeekCalls(calls);
    expect([q.get("filters"), q.get("startDate"), q.get("endDate"), q.get("metrics")]).toEqual(["video==v2", "2026-11-01", "2026-11-07", "views"]);
  });

  it("counts a first week with no rows as no views", async () => {
    api(withFirstWeeks(() => ({})));
    const snap = await fetchYouTube("token", W, { externalId: "UC1", maxPosts: 200 });
    expect(snap.firstWeeks).toEqual([{ externalId: "v2", views: 0 }]);
  });

  it("doesn't ask again for videos whose first week is stored", async () => {
    const calls = api(withFirstWeeks(() => ({ views: 1 })));
    await fetchYouTube("token", W, { externalId: "UC1", maxPosts: 200, firstWeekKnown: new Set(["v2"]) });
    expect(firstWeekCalls(calls)).toEqual([]);
  });

  it("also reads stored videos older than this sync's upload list reaches", async () => {
    const calls = api(withFirstWeeks((id) => ({ views: id === "old" ? 77 : 1 })));
    const snap = await fetchYouTube("token", W, {
      externalId: "UC1",
      maxPosts: 200,
      firstWeekKnown: new Set(["v2"]),
      firstWeekMissing: [{ externalId: "old", publishedAt: new Date("2024-03-05T18:00:00Z") }],
    });
    expect(snap.firstWeeks).toEqual([{ externalId: "old", views: 77 }]);
    expect(firstWeekCalls(calls).map((q) => q.get("filters"))).toEqual(["video==old"]);
  });

  it("leaves first weeks for the next sync when out of quota, without failing the sync", async () => {
    api(withFirstWeeks(() => ({ status: 429 })));
    const snap = await fetchYouTube("token", W, { externalId: "UC1", maxPosts: 200 });
    expect(snap.firstWeeks).toEqual([]);
    expect(snap.daily).toHaveLength(3);
  });
});

describe("helpers", () => {
  it.each([
    ["PT12M3S", 723],
    ["PT1H", 3600],
    ["PT45S", 45],
    ["P1DT1S", 86401],
    ["nonsense", 0],
  ])("parseDuration(%s) = %d", (iso, s) => expect(parseDuration(iso)).toBe(s));

  it("never reports negative followers", () => {
    const rows = dailyRows([{ day: "2026-11-10", subscribersGained: 50, subscribersLost: 0 }], 10, []);
    expect(rows[0].followers).toBe(10);
    expect(dailyRows([{ day: "2026-11-09", subscribersGained: 0 }, { day: "2026-11-10", subscribersGained: 50 }], 10, [])[0].followers).toBe(0);
  });

  it("measures country shares against all views, leaving room for Other", () => {
    const rows = audienceRows(null, [{ country: "US", views: 300 }, { country: "PH", views: 100 }], 1000)!;
    expect(rows).toEqual([
      { dimension: "country", key: "US", share: 30 },
      { dimension: "country", key: "PH", share: 10 },
    ]);
  });

  it("returns null when there are no demographics at all", () => {
    expect(audienceRows([], null, 100)).toBeNull();
  });
});

describe("simulatedSnapshot", () => {
  it("is deterministic per platform and date", () => {
    const a = simulatedSnapshot("youtube", { start: "2026-11-01", end: "2026-11-15" });
    const b = simulatedSnapshot("youtube", { start: "2026-11-10", end: "2026-11-15" });
    expect(b.daily).toEqual(a.daily.slice(-6));
    expect(a.followers).toBe(a.daily.at(-1)!.followers);
  });

  it("keeps follower totals consistent with daily gains", () => {
    const { daily } = simulatedSnapshot("tiktok", { start: "2026-10-01", end: "2026-11-15" });
    for (let i = 1; i < daily.length; i++) expect(daily[i].followers! - daily[i - 1].followers!).toBe(daily[i].followersGained);
  });

  it("gives TikTok no demographics, like the real API", () => {
    expect(simulatedSnapshot("tiktok", W).audience).toBeNull();
    expect(simulatedSnapshot("youtube", W).audience?.length).toBeGreaterThan(0);
  });
});
