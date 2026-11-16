import { isoDate } from "@/lib/dates";
import type { AudienceRow, DailyRow, PostRow } from "./types";

export interface DayActivity {
  date: string;
  /** Net follower change that day. */
  net: number;
  views: number;
  engagements: number;
}

/** Daily rows, oldest first, with follower totals rebuilt backwards from today's count. */
export function buildDaily(days: DayActivity[], followersNow: number, posts: PostRow[]): DailyRow[] {
  const published = new Map<string, number>();
  for (const p of posts) published.set(isoDate(p.publishedAt), (published.get(isoDate(p.publishedAt)) ?? 0) + 1);
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const out: DailyRow[] = [];
  let followers = followersNow;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const d = sorted[i];
    out.unshift({ date: d.date, followers: Math.max(0, followers), followersGained: d.net, views: d.views, engagements: d.engagements, posts: published.get(d.date) ?? 0, watchMinutes: null });
    followers -= d.net;
  }
  return out;
}

/** Age buckets as platforms name them ("25-34", "age25-34", "65+") → the dashboard's labels. */
export function ageLabel(raw: string): string | null {
  const m = /(\d+)\D+(\d+)?/.exec(raw);
  if (!m) return null;
  const from = Number(m[1]);
  if (from >= 45) return "45+";
  return { 13: "13–17", 18: "18–24", 25: "25–34", 35: "35–44" }[from] ?? null;
}

/** Counts per key → percentage shares (the platform may report counts, not percentages). */
export function sharesOf(dimension: AudienceRow["dimension"], counts: [string, number][]): AudienceRow[] {
  const merged = new Map<string, number>();
  for (const [k, v] of counts) merged.set(k, (merged.get(k) ?? 0) + v);
  const total = [...merged.values()].reduce((s, v) => s + v, 0);
  return total > 0 ? [...merged].map(([key, v]) => ({ dimension, key, share: (v / total) * 100 })) : [];
}

/** First line of a caption, trimmed to a readable title. */
export function titleFrom(text: string | null | undefined, fallback: string): string {
  const line = (text ?? "").split(/\r?\n/).find((l) => l.trim())?.trim() ?? "";
  if (!line) return fallback;
  return line.length > 90 ? `${line.slice(0, 87).trimEnd()}…` : line;
}
