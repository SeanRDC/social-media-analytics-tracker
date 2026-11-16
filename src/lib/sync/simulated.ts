/**
 * Generated history for simulated connections (local development without
 * platform credentials), so importing, storage and every dashboard page can be
 * exercised end to end. Values depend only on platform and date, so re-syncing
 * the same days reproduces the same numbers.
 */
import { addDays, daysBetween, dateRange, parseIso } from "@/lib/dates";
import type { PlatformId, PostKind } from "@/lib/data/types";
import type { AudienceRow, PlatformSnapshot, PostRow, SyncWindow } from "./types";

interface Profile {
  base: number;
  gain: number;
  views: number;
  rate: number;
  cadence: number;
  kinds: PostKind[];
  postViews: number;
  watch: number | null;
  demographics: boolean;
}

const PROFILES: Record<PlatformId, Profile> = {
  youtube: { base: 104_000, gain: 130, views: 22_000, rate: 0.05, cadence: 3, kinds: ["video", "short"], postViews: 40_000, watch: 300, demographics: true },
  facebook: { base: 20_500, gain: 16, views: 9_000, rate: 0.023, cadence: 4, kinds: ["post", "video"], postViews: 11_000, watch: 40, demographics: true },
  tiktok: { base: 41_000, gain: 85, views: 85_000, rate: 0.089, cadence: 2, kinds: ["video"], postViews: 60_000, watch: 20, demographics: false },
  linkedin: { base: 8_900, gain: 10, views: 2_500, rate: 0.03, cadence: 7, kinds: ["post"], postViews: 6_000, watch: null, demographics: true },
  instagram: { base: 53_000, gain: 75, views: 40_000, rate: 0.064, cadence: 2, kinds: ["reel", "post"], postViews: 45_000, watch: 25, demographics: true },
  x: { base: 5_000, gain: 5, views: 3_000, rate: 0.02, cadence: 2, kinds: ["post"], postViews: 2_000, watch: null, demographics: false },
};

const TITLES = [
  "Studio tour in 30 seconds",
  "How we light product shots",
  "Before and after: kitchen set",
  "Desk setup tour",
  "Lighting a small room",
  "3 lenses we always pack",
  "Golden hour on the pier",
  "Editing a client reel live",
  "Behind the scenes: brand shoot",
  "What clients ask before a shoot",
  "Color grading in five minutes",
  "A day on set with the team",
];

/** Stable pseudo-random number in [0, 1) for a platform and an integer. */
function noise(platform: string, n: number): number {
  let h = 2166136261 ^ n;
  for (const c of platform) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const EPOCH = "2025-01-01";

export function simulatedSnapshot(platform: PlatformId, window: SyncWindow): PlatformSnapshot {
  const p = PROFILES[platform];
  const gainOn = (d: number) => Math.round(p.gain * (1 + 0.35 * Math.sin(d / 5)) * (0.6 + 0.8 * noise(platform, d)));
  const viewsOn = (iso: string, d: number) => {
    const weekend = [0, 6].includes(parseIso(iso).getUTCDay()) ? 1.25 : 1;
    return Math.round(p.views * weekend * (1 + 0.2 * Math.sin(d * 0.9)) * (0.75 + 0.5 * noise(platform, d + 7919)));
  };

  // followers at the day before the window, then forward
  const first = daysBetween(EPOCH, window.start);
  let followers = p.base;
  for (let d = 0; d < first; d++) followers += gainOn(d);

  const days = dateRange(window.start, window.end);
  const posts: PostRow[] = [];
  for (let d = 0; d <= daysBetween(EPOCH, window.end); d++) {
    if (d % p.cadence !== 0 || d < daysBetween(EPOCH, window.end) - 200) continue;
    const date = addDays(EPOCH, d);
    const age = daysBetween(date, window.end);
    const views = Math.round(p.postViews * (0.3 + 1.7 * noise(platform, d + 31)) * Math.min(1, (age + 1) / 7));
    const eng = views * p.rate * (0.7 + 0.6 * noise(platform, d + 77));
    posts.push({
      externalId: `${platform}-${date}`,
      title: TITLES[d % TITLES.length],
      kind: p.kinds[d % p.kinds.length],
      // posting times vary so "best time to post" has something to show
      publishedAt: new Date(`${date}T${String(8 + Math.floor(noise(platform, d + 3) * 14)).padStart(2, "0")}:00:00Z`),
      thumbnailUrl: null,
      permalink: null,
      views,
      likes: Math.round(eng * 0.8),
      comments: Math.round(eng * 0.12),
      shares: Math.round(eng * 0.08),
      avgWatchSeconds: p.watch == null ? null : Math.round(p.watch * (0.6 + 0.8 * noise(platform, d + 11))),
    });
  }
  const publishedOn = (iso: string) => posts.filter((x) => x.externalId === `${platform}-${iso}`).length;

  const daily = days.map((date) => {
    const d = daysBetween(EPOCH, date);
    const gained = gainOn(d);
    followers += gained;
    const views = viewsOn(date, d);
    return {
      date,
      followers,
      followersGained: gained,
      views,
      engagements: Math.round(views * p.rate * (0.8 + 0.4 * noise(platform, d + 101))),
      posts: publishedOn(date),
      watchMinutes: p.watch == null ? null : Math.round((views * p.watch) / 60 / 3),
    };
  });

  return { followers, daily, posts, audience: p.demographics ? audience(platform) : null };
}

function audience(platform: string): AudienceRow[] {
  const tilt = noise(platform, 1) * 4 - 2;
  const ages: [string, number][] = [
    ["13–17", 4],
    ["18–24", 30 + tilt],
    ["25–34", 38 - tilt],
    ["35–44", 17],
    ["45+", 11],
  ];
  const countries: [string, number][] = [
    ["US", 33 + tilt],
    ["PH", 18],
    ["GB", 11 - tilt],
    ["CA", 8],
    ["AU", 6],
    ["DE", 4],
    ["IN", 3],
  ];
  return [
    ...ages.map(([key, share]) => ({ dimension: "age" as const, key, share })),
    ...countries.map(([key, share]) => ({ dimension: "country" as const, key, share })),
    { dimension: "gender", key: "female", share: 48 },
    { dimension: "gender", key: "male", share: 50 },
    { dimension: "gender", key: "user_specified", share: 2 },
  ];
}
