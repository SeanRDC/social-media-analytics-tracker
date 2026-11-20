import { afterEach, describe, expect, it, vi } from "vitest";
import { ReauthRequired } from "@/lib/connect/providers";
import { fetchLinkedIn } from "@/lib/sync/linkedin";
import { fetchTikTok } from "@/lib/sync/tiktok";

afterEach(() => vi.unstubAllGlobals());

type Reply = { status?: number; body: unknown };
function api(route: (url: string, init?: RequestInit) => Reply) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const r = route(url, init);
      return Response.json(r.body, { status: r.status ?? 200 });
    }),
  );
  return calls;
}

const W = { start: "2026-11-14", end: "2026-11-15" };

describe("fetchTikTok", () => {
  it("reads followers and pages through videos", async () => {
    const calls = api((url, init) => {
      if (url.includes("/user/info/")) return { body: { data: { user: { open_id: "o1", follower_count: 4200 } }, error: { code: "ok" } } };
      const cursor = JSON.parse(String(init?.body)).cursor;
      return cursor
        ? { body: { data: { videos: [{ id: "v2", title: "", video_description: "Desk setup tour #studio", create_time: 1763200000, view_count: 50 }], has_more: false }, error: { code: "ok" } } }
        : { body: { data: { videos: [{ id: "v1", title: "Studio tour", create_time: 1763290000, view_count: 9000, like_count: 700, comment_count: 30, share_count: 12, share_url: "https://tiktok.com/v1", cover_image_url: "https://cdn/v1.jpg" }], cursor: 1763200001, has_more: true }, error: { code: "ok" } } };
    });
    const s = await fetchTikTok("t", W, { externalId: "o1", maxPosts: 200 });
    expect(s).toMatchObject({ followers: 4200, daily: [], derive: true, audience: null });
    expect(s.posts.map((p) => p.title)).toEqual(["Studio tour", "Desk setup tour #studio"]);
    expect(s.posts[0]).toMatchObject({ views: 9000, likes: 700, comments: 30, shares: 12, permalink: "https://tiktok.com/v1", thumbnailUrl: "https://cdn/v1.jpg", kind: "video" });
    expect(calls[1].init?.method).toBe("POST");
    expect(calls[1].url).toContain("view_count");
  });

  it("stops paging once it has as many posts as the sync asked for", async () => {
    let page = 0;
    const calls = api((url) => {
      if (url.includes("/user/info/")) return { body: { data: { user: { open_id: "o1", follower_count: 1 } }, error: { code: "ok" } } };
      page++;
      const videos = Array.from({ length: 20 }, (_, i) => ({ id: `v${page}-${i}`, title: "t", create_time: 1763200000, view_count: 1 }));
      return { body: { data: { videos, cursor: page * 20, has_more: true }, error: { code: "ok" } } };
    });
    const s = await fetchTikTok("t", W, { externalId: "o1", maxPosts: 50 });
    expect(s.posts).toHaveLength(50);
    expect(calls.filter((c) => c.url.includes("/video/list/"))).toHaveLength(3);
  });

  it("asks to reconnect when the token is no longer valid", async () => {
    api(() => ({ status: 401, body: { error: { code: "access_token_invalid", message: "expired" } } }));
    await expect(fetchTikTok("t", W, { externalId: "o1", maxPosts: 200 })).rejects.toBeInstanceOf(ReauthRequired);
  });
});

describe("fetchLinkedIn", () => {
  const start = Date.UTC(2026, 10, 14);
  const next = Date.UTC(2026, 10, 15);

  it("builds daily history from follower gains and share statistics", async () => {
    const calls = api((url) => {
      if (url.includes("/networkSizes/")) return { body: { firstDegreeSize: 900 } };
      if (url.includes("organizationalEntityFollowerStatistics"))
        return { body: { elements: [{ timeRange: { start, end: next }, followerGains: { organicFollowerGain: 4, paidFollowerGain: 1 } }, { timeRange: { start: next, end: next + 86400000 }, followerGains: { organicFollowerGain: 3 } }] } };
      if (url.includes("organizationalEntityShareStatistics") && url.includes("timeIntervals"))
        return { body: { elements: [{ timeRange: { start, end: next }, totalShareStatistics: { impressionCount: 300, likeCount: 10, commentCount: 2, shareCount: 1 } }] } };
      if (url.includes("/posts?")) return { body: { elements: [{ id: "urn:li:share:7", commentary: "What clients ask before a shoot", publishedAt: start + 3600000 }] } };
      if (url.includes("shares=List")) return { body: { elements: [{ share: "urn:li:share:7", totalShareStatistics: { impressionCount: 820, likeCount: 30, commentCount: 4, shareCount: 2 } }] } };
      return { status: 404, body: {} };
    });
    const s = await fetchLinkedIn("t", W, { externalId: "42", maxPosts: 200 });
    expect(s.daily.map((d) => [d.date, d.followers, d.followersGained, d.views, d.engagements])).toEqual([
      ["2026-11-14", 897, 5, 300, 13],
      ["2026-11-15", 900, 3, 0, 0],
    ]);
    expect(s.posts[0]).toMatchObject({ title: "What clients ask before a shoot", views: 820, likes: 30, permalink: "https://www.linkedin.com/feed/update/urn:li:share:7" });
    // Rest.li structure stays literal; URNs are encoded
    const stats = calls.find((c) => c.url.includes("FollowerStatistics"))!.url;
    expect(stats).toContain("organizationalEntity=urn%3Ali%3Aorganization%3A42");
    expect(stats).toContain(`timeIntervals=(timeRange:(start:${start},end:${next + 86400000}),timeGranularityType:DAY)`);
    expect((calls[0].init?.headers as Record<string, string>)["X-Restli-Protocol-Version"]).toBe("2.0.0");
  });

  it("derives today's row when statistics are not available to the app", async () => {
    api((url) => (url.includes("/networkSizes/") ? { body: { firstDegreeSize: 900 } } : url.includes("/posts?") ? { body: { elements: [] } } : { status: 403, body: { message: "Not enough permissions" } }));
    expect(await fetchLinkedIn("t", W, { externalId: "42", maxPosts: 200 })).toMatchObject({ followers: 900, daily: [], derive: true });
  });
});
