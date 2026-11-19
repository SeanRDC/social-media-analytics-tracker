/**
 * One description of each report, used for the CSV download, the print-ready
 * PDF view and the weekly email. Pure: it only arranges data it is given.
 */
import type { IconName } from "@/components/icons/Icon";
import { addDays } from "@/lib/dates";
import type { Audience, DailyViews, Metrics, Overview, Platform, Post, Range } from "@/lib/data/types";
import { postsInRange, sortPosts } from "@/lib/data/sort";
import { PLATFORM_NAMES } from "@/lib/platforms";

export type PresetId = "monthly" | "weekly" | "content" | "client";

export const PRESETS: { id: PresetId; title: string; desc: string; icon: IconName; includes: string[] }[] = [
  { id: "monthly", title: "Monthly performance", desc: "Followers, views and engagement for every platform over the last 30 days.", icon: "chart", includes: ["Overview", "Platforms", "Top posts"] },
  { id: "weekly", title: "Weekly snapshot", desc: "One page with the week's growth and your best post. Good for Monday mornings.", icon: "calendar", includes: ["Growth", "Best post"] },
  { id: "content", title: "Content deep-dive", desc: "Every post ranked by views and engagement, with watch time and shares.", icon: "play", includes: ["All posts", "Watch time", "Shares"] },
  { id: "client", title: "Client summary", desc: "A clean summary of results and audience, ready to send to a client.", icon: "users", includes: ["Highlights", "Audience", "Top posts"] },
];

export const isPreset = (id: string): id is PresetId => PRESETS.some((p) => p.id === id);

export interface ReportData {
  asOf: string;
  /** Sample numbers (nothing imported yet) are labelled as such. */
  sample: boolean;
  overview: Overview;
  daily: DailyViews;
  platforms: Platform[];
  posts: Post[];
  audience: Audience;
}

export type Cell = string | number;

export interface Section {
  heading: string;
  columns: string[];
  rows: Cell[][];
}

export interface Report {
  id: PresetId;
  title: string;
  /** e.g. "Last 30 days · 17 Oct – 15 Nov 2026" */
  period: string;
  note?: string;
  sections: Section[];
}

/** What a report shows where the platform did not report a number. */
const NONE = "No data";
const pct = (n: number | null) => (n === null ? NONE : `${Math.round(n * 10) / 10}%`);
const signed = (n: number | null) => (n === null ? NONE : n > 0 ? `+${n}` : String(n));
const value = (n: number | null): Cell => (n === null ? NONE : n);
const date = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function summary(m: Metrics, days: Range): Section {
  return {
    heading: `Summary (last ${days} days)`,
    columns: ["Metric", "Value", "Change"],
    rows: [
      ["Followers", value(m.followers), signed(m.followerDelta)],
      ["Views", value(m.views), m.viewsChange === null ? (m.comparable ? "No views the period before" : m.dataSince ? `Reported since ${date(m.dataSince)}` : "No comparison") : `${signed(m.viewsChange)}%`],
      ["Engagement rate", pct(m.engagement), m.engagementChange === null ? "No comparison" : `${signed(Math.round(m.engagementChange * 10) / 10)} pts`],
      ["Posts", m.posts, ""],
    ],
  };
}

const connected = (d: ReportData) => d.platforms.filter((p) => p.status === "connected");

function platformsSection(d: ReportData): Section {
  return {
    heading: "Platforms",
    columns: ["Platform", "Account", "Followers", "Growth (30 days)", "Views (30 days)", "Engagement rate", "Posts (30 days)"],
    rows: connected(d).map((p) => [p.name, p.account, value(p.followers), signed(p.followerGrowth[30]), value(p.views30), pct(p.engagement), p.posts30]),
  };
}

function postsSection(heading: string, posts: Post[], detailed = false): Section {
  const base = ["Title", "Platform", "Published", "Views", "Engagement rate", "Likes", "Comments", "Shares"];
  return {
    heading,
    columns: detailed ? [...base.slice(0, 2), "Type", ...base.slice(2), "Avg. watch (s)", "Link"] : base,
    rows: posts.map((p) => {
      const row: Cell[] = [p.title, PLATFORM_NAMES[p.platform], p.publishedAt, p.views, pct(p.engagement), p.likes, p.comments, p.shares];
      return detailed ? [...row.slice(0, 2), p.kind, ...row.slice(2), p.avgWatchSeconds == null ? "" : Math.round(p.avgWatchSeconds), p.permalink ?? ""] : row;
    }),
  };
}

export function buildReport(id: PresetId, d: ReportData): Report {
  const preset = PRESETS.find((p) => p.id === id)!;
  const span = (days: number) => `Last ${days} days · ${date(addDays(d.asOf, -(days - 1)))} – ${date(d.asOf)}`;
  const top = (days: number, n: number) => sortPosts(postsInRange(d.posts, days, d.asOf), "views").slice(0, n);
  const note = d.sample ? "Sample data: connect and import a platform to report on your own numbers." : undefined;
  const base = { id, title: preset.title, note };

  switch (id) {
    case "monthly":
      return { ...base, period: span(30), sections: [summary(d.overview.metrics[30], 30), platformsSection(d), postsSection("Top posts (last 30 days)", top(30, 10))] };
    case "weekly":
      return {
        ...base,
        period: span(7),
        sections: [
          summary(d.overview.metrics[7], 7),
          {
            heading: "Day by day",
            columns: ["Day", "New followers", "Views", "Views a week earlier"],
            rows: d.overview.weekGrowth.map((g, i) => [g.day, signed(g.value), value(d.daily.thisWeek[i] ?? null), value(d.daily.lastWeek[i] ?? null)]),
          },
          postsSection("Best post this week", top(7, 1)),
        ],
      };
    case "content":
      return { ...base, period: `All stored posts · as of ${date(d.asOf)}`, sections: [postsSection("All posts, most viewed first", sortPosts(d.posts, "views"), true)] };
    case "client":
      return {
        ...base,
        period: span(30),
        sections: [
          summary(d.overview.metrics[30], 30),
          { heading: "Platforms", columns: ["Platform", "Followers", "Growth (30 days)", "Engagement rate"], rows: connected(d).map((p) => [p.name, value(p.followers), signed(p.followerGrowth[30]), pct(p.engagement)]) },
          { heading: "Audience by age", columns: ["Age", "Share"], rows: d.audience.ages.map((a) => [a.label, `${a.share}%`]) },
          { heading: "Audience by country", columns: ["Country", "Share"], rows: d.audience.countries.map((c) => [c.name, `${c.share}%`]) },
          postsSection("Top posts (last 30 days)", top(30, 5)),
        ].filter((s) => s.rows.length > 0),
      };
  }
}

const csvCell = (c: Cell) => {
  const s = String(c);
  // quote when needed; neutralise spreadsheet formulas in text cells
  const safe = typeof c === "string" && /^[=+\-@]/.test(s) && !/^[+-]\d/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** CSV with every section in turn, each under its heading. Starts with a BOM so Excel reads UTF-8. */
export function toCsv(r: Report): string {
  const lines: string[] = [csvCell(r.title), csvCell(r.period)];
  if (r.note) lines.push(csvCell(r.note));
  for (const s of r.sections) {
    lines.push("", csvCell(s.heading), s.columns.map(csvCell).join(","));
    for (const row of s.rows) lines.push(row.map(csvCell).join(","));
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}

export const reportFilename = (r: Report, asOf: string, ext: string) => `${r.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${asOf}.${ext}`;
