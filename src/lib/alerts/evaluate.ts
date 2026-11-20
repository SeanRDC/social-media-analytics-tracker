/**
 * Alert rules, pure: given a user's imported numbers, which alerts apply today.
 * Each alert has a key so it is sent once (a post id, a milestone, a week).
 */
import { addDays, isoDate, parseIso } from "@/lib/dates";
import { computeOverview, daysEnding, type Dataset } from "@/lib/data/compute";
import type { PlatformId } from "@/lib/data/types";
import { formatCompact } from "@/lib/format";
import { PLATFORM_NAMES } from "@/lib/platforms";
import type { AlertKind } from "./kinds";

export { ALERT_KINDS, type AlertKind } from "./kinds";

export const ALERT_DEFAULTS: Record<AlertKind, boolean> = { spike: true, milestone: true, drop: false, reconnect: true };

export interface Alert {
  kind: AlertKind;
  key: string;
  title: string;
  body: string;
  /** Path in the app to open. */
  url: string;
}

const MILESTONE = 10_000;
const SPIKE_MIN_VIEWS = 100;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/** Monday of the week containing `iso`. */
const weekOf = (iso: string) => addDays(iso, -((parseIso(iso).getUTCDay() + 6) % 7));

/** A connection that lost access: since when (ISO date) and how many whole days remain before its data is deleted. */
export interface LostAccess {
  platform: PlatformId;
  since: string;
  daysLeft: number;
}

const days = (n: number) => (n === 1 ? "1 day" : `${n} days`);

export function evaluateAlerts(ds: Dataset | null, asOf: string | null, expired: LostAccess[]): Alert[] {
  const alerts: Alert[] = [];
  for (const { platform, since, daysLeft } of expired) {
    const name = PLATFORM_NAMES[platform];
    alerts.push({
      kind: "reconnect",
      key: `${platform}:${since}`,
      title: `${name} needs reconnecting`,
      body: `${name} stopped sharing your stats with us. Reconnect it in Settings within ${days(Math.max(1, daysLeft))} to keep your numbers, or we'll delete the data we stored from it.`,
      url: "/settings",
    });
    // a last reminder shortly before the data goes
    if (daysLeft > 0 && daysLeft <= 2) {
      alerts.push({
        kind: "reconnect",
        key: `${platform}:${since}:reminder`,
        title: `${days(daysLeft)} left to reconnect ${name}`,
        body: `We still can't reach ${name}. Reconnect it in Settings within ${days(daysLeft)}, or we'll delete the ${name} data we stored.`,
        url: "/settings",
      });
    }
  }
  if (!ds || !asOf) return alerts;
  const live = ds.connections.filter((c) => c.status === "connected" && c.daily.length);

  // a new post taking off: recent posts against the median of the months before
  for (const c of live) {
    const posts = ds.posts.filter((p) => p.platform === c.platform);
    const recent = posts.filter((p) => isoDate(p.publishedAt) >= addDays(asOf, -2));
    const earlier = posts.filter((p) => isoDate(p.publishedAt) < addDays(asOf, -2) && isoDate(p.publishedAt) >= addDays(asOf, -92)).map((p) => p.views);
    if (earlier.length < 3) continue;
    const usual = median(earlier);
    for (const p of recent) {
      if (p.views < SPIKE_MIN_VIEWS || p.views < usual * 2) continue;
      alerts.push({
        kind: "spike",
        key: p.id,
        title: "A post is taking off",
        body: `“${p.title}” on ${PLATFORM_NAMES[p.platform]} has ${formatCompact(p.views)} views, ${(p.views / Math.max(1, usual)).toFixed(1)}× your usual.`,
        url: `/content?post=${encodeURIComponent(p.id)}`,
      });
    }
  }

  // follower milestones, each multiple of 10K once per platform
  for (const c of live) {
    const [prev, now] = daysEnding(c, asOf, 2).map((d) => d.followers);
    // only compare two reported totals
    if (prev === null || now === null) continue;
    const reached = Math.floor(now / MILESTONE) * MILESTONE;
    if (reached >= MILESTONE && Math.floor(prev / MILESTONE) * MILESTONE < reached) {
      alerts.push({
        kind: "milestone",
        key: `${c.platform}:${reached}`,
        title: `${formatCompact(reached)} on ${PLATFORM_NAMES[c.platform]}`,
        body: `Your ${PLATFORM_NAMES[c.platform]} account just passed ${formatCompact(reached)} followers.`,
        url: `/platforms/${c.platform}`,
      });
    }
  }

  // engagement drop, at most once a week
  if (live.length) {
    const m = computeOverview(ds, asOf).metrics[7];
    // a change exists only when both weeks were fully reported
    const before = m.engagement !== null && m.engagementChange !== null ? m.engagement - m.engagementChange : null;
    if (m.engagement !== null && before !== null && before > 0 && m.engagement < before * 0.8) {
      alerts.push({
        kind: "drop",
        key: `week-of:${weekOf(asOf)}`,
        title: "Engagement dropped this week",
        body: `Engagement fell from ${before.toFixed(1)}% to ${m.engagement.toFixed(1)}% compared with the week before.`,
        url: "/overview",
      });
    }
  }
  return alerts;
}
