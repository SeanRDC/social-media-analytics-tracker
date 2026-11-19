import { afterEach, describe, expect, it, vi } from "vitest";
import { ReauthRequired } from "@/lib/connect/providers";
import { simulatedSnapshot } from "@/lib/sync/simulated";
import { audienceRows, dailyRows, fetchYouTube, parseDuration } from "@/lib/sync/youtube";

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
    const snap = await fetchYouTube("token", W);
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
    await expect(fetchYouTube("token", W)).rejects.toBeInstanceOf(ReauthRequired);
  });

  it("handles a channel without uploads", async () => {
    api({ ...channelRoutes, "/channels": () => ({ body: { items: [{ statistics: { subscriberCount: "3" }, contentDetails: { relatedPlaylists: {} } }] } }) });
    const snap = await fetchYouTube("token", W);
    expect(snap.posts).toEqual([]);
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
