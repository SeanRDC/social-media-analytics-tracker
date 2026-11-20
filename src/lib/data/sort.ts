import type { PostSort } from "./types";
import { DAY_MS } from "@/lib/dates";

type Sortable = { views: number; engagement: number; publishedAt: string };

/** Highest first for views and engagement, newest first for date. Stable; never mutates. */
export function sortPosts<T extends Sortable>(posts: readonly T[], key: PostSort): T[] {
  const value = (p: T) => (key === "date" ? Date.parse(p.publishedAt) : key === "views" ? p.views : p.engagement);
  return posts
    .map((p, i) => ({ p, i }))
    .sort((a, b) => value(b.p) - value(a.p) || a.i - b.i)
    .map((x) => x.p);
}

export const SORT_LABELS: Record<PostSort, string> = {
  views: "Most viewed",
  engagement: "Most engaging",
  date: "Newest",
};


/** Posts published in the last `days` days up to and including `asOf` (ISO dates). */
export function postsInRange<T extends { publishedAt: string }>(posts: readonly T[], days: number, asOf: string): T[] {
  const end = Date.parse(asOf);
  const start = end - (days - 1) * DAY_MS;
  return posts.filter((p) => {
    const t = Date.parse(p.publishedAt);
    return t >= start && t <= end;
  });
}
