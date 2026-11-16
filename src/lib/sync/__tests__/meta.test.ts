import { afterEach, describe, expect, it, vi } from "vitest";
import { ReauthRequired } from "@/lib/connect/providers";
import { ageLabel, sharesOf, titleFrom } from "@/lib/sync/daily";
import { fetchFacebook } from "@/lib/sync/facebook";
import { fetchInstagram } from "@/lib/sync/instagram";

afterEach(() => vi.unstubAllGlobals());

type Route = (url: URL) => { status?: number; body: unknown };
function api(routes: [RegExp, Route][]) {
  const calls: URL[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = new URL(input);
      calls.push(url);
      const hit = routes.find(([re]) => re.test(url.pathname + url.search));
      const r = hit ? hit[1](url) : { status: 400, body: { error: { code: 100, message: "Unknown" } } };
      return Response.json(r.body, { status: r.status ?? 200 });
    }),
  );
  return calls;
}

const W = { start: "2026-11-13", end: "2026-11-15" };
const day = (date: string, value: number) => ({ value, end_time: `${date}T08:00:00+0000` });

describe("fetchFacebook", () => {
  it("builds daily history from Page insights and reads posts with their counts", async () => {
    const calls = api([
      [/\/p1\?/, () => ({ body: { followers_count: 500 } })],
      [
        /published_posts/,
        () => ({
          body: {
            data: [
              {
                id: "p1_1",
                message: "Hiring a second editor\nDetails inside",
                created_time: "2026-11-14T10:00:00+0000",
                permalink_url: "https://facebook.com/p1_1",
                status_type: "mobile_status_update",
                shares: { count: 3 },
                reactions: { summary: { total_count: 20 } },
                comments: { summary: { total_count: 4 } },
                insights: { data: [{ name: "post_media_view", values: [{ value: 900 }] }] },
              },
            ],
          },
        }),
      ],
      [/metric=page_daily_follows_unique/, () => ({ body: { data: [{ name: "page_daily_follows_unique", values: [day("2026-11-14", 5), day("2026-11-15", 3), day("2026-11-16", 2)] }] } })],
      [/metric=page_daily_unfollows_unique/, () => ({ body: { data: [{ name: "page_daily_unfollows_unique", values: [day("2026-11-15", 1)] }] } })],
      [/metric=page_media_view/, () => ({ body: { data: [{ name: "page_media_view", values: [day("2026-11-14", 100), day("2026-11-15", 120), day("2026-11-16", 80)] }] } })],
      // page_post_engagements unavailable: the rest still arrives
    ]);
    const s = await fetchFacebook("page-token", W, { externalId: "p1" });
    expect(s.derive).toBeUndefined();
    expect(s.daily.map((d) => [d.date, d.followers, d.followersGained, d.views])).toEqual([
      ["2026-11-13", 496, 5, 100],
      ["2026-11-14", 498, 2, 120],
      ["2026-11-15", 500, 2, 80],
    ]);
    expect(s.posts[0]).toMatchObject({ title: "Hiring a second editor", kind: "post", views: 900, likes: 20, comments: 4, shares: 3, permalink: "https://facebook.com/p1_1" });
    expect(s.audience).toBeNull();
    // until is exclusive, so it is the day after the window
    expect(calls.find((u) => u.pathname.endsWith("/insights"))?.searchParams.get("until")).toBe("2026-11-16");
  });

  it("falls back to deriving today's row when no daily insights are available", async () => {
    api([
      [/\/p1\?/, () => ({ body: { followers_count: 500 } })],
      [/published_posts/, () => ({ body: { data: [] } })],
    ]);
    const s = await fetchFacebook("t", W, { externalId: "p1" });
    expect(s).toMatchObject({ followers: 500, daily: [], derive: true });
  });

  it("asks to reconnect on an invalid Page token", async () => {
    api([[/\/p1\?/, () => ({ status: 400, body: { error: { code: 190, message: "Invalid OAuth access token" } } })]]);
    await expect(fetchFacebook("t", W, { externalId: "p1" })).rejects.toBeInstanceOf(ReauthRequired);
  });
});

describe("fetchInstagram", () => {
  const routes: [RegExp, Route][] = [
    [/^\/me\?/, () => ({ body: { user_id: "178", username: "northbay", followers_count: 1200 } })],
    [
      /^\/me\/media/,
      (u) =>
        u.searchParams.get("fields")!.includes("insights")
          ? {
              body: {
                data: [
                  {
                    id: "m1",
                    caption: "Golden hour on the pier",
                    media_type: "VIDEO",
                    media_product_type: "REELS",
                    timestamp: "2026-11-14T18:00:00+0000",
                    permalink: "https://instagram.com/p/m1",
                    thumbnail_url: "https://cdn/m1.jpg",
                    like_count: 80,
                    comments_count: 6,
                    insights: { data: [{ name: "views", values: [{ value: 4000 }] }, { name: "shares", values: [{ value: 9 }] }] },
                  },
                ],
              },
            }
          : { body: { data: [] } },
    ],
    [/breakdown=age/, () => ({ body: { data: [{ total_value: { breakdowns: [{ results: [{ dimension_values: ["25-34"], value: 60 }, { dimension_values: ["55-64"], value: 40 }] }] } }] } })],
    [/breakdown=country/, () => ({ status: 400, body: { error: { code: 100, message: "Not enough followers" } } })],
    [/breakdown=gender/, () => ({ body: { data: [{ total_value: { breakdowns: [{ results: [{ dimension_values: ["F"], value: 3 }, { dimension_values: ["M"], value: 1 }] }] } }] } })],
  ];

  it("reads totals for the sync to derive today's row", async () => {
    api(routes);
    const s = await fetchInstagram("t", W, { externalId: "178" });
    expect(s).toMatchObject({ followers: 1200, daily: [], derive: true });
    expect(s.posts[0]).toMatchObject({ title: "Golden hour on the pier", kind: "reel", views: 4000, likes: 80, comments: 6, shares: 9, thumbnailUrl: "https://cdn/m1.jpg" });
    expect(s.audience).toEqual(
      expect.arrayContaining([
        { dimension: "age", key: "25–34", share: 60 },
        { dimension: "age", key: "45+", share: 40 },
        { dimension: "gender", key: "female", share: 75 },
      ]),
    );
  });
});

describe("helpers", () => {
  it.each([
    ["13-17", "13–17"],
    ["age18-24", "18–24"],
    ["25-34", "25–34"],
    ["35-44", "35–44"],
    ["45-54", "45+"],
    ["65+", "45+"],
    ["unknown", null],
  ])("ageLabel(%s) = %s", (raw, label) => expect(ageLabel(raw)).toBe(label));

  it("turns counts into shares", () => {
    expect(sharesOf("country", [["US", 3], ["PH", 1]])).toEqual([
      { dimension: "country", key: "US", share: 75 },
      { dimension: "country", key: "PH", share: 25 },
    ]);
    expect(sharesOf("country", [])).toEqual([]);
  });

  it("makes a title from the first line of a caption", () => {
    expect(titleFrom("\n  Hello there \nmore", "x")).toBe("Hello there");
    expect(titleFrom("", "Fallback")).toBe("Fallback");
    expect(titleFrom("a".repeat(120), "x")).toHaveLength(88);
  });
});
