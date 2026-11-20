/**
 * The data layer the dashboard depends on. Each function answers for the
 * signed-in user from their imported numbers. Pages check hasData() first and
 * show the empty state when it's false. Reads the session: call inside Suspense.
 */
import "server-only";
import { cache } from "react";
import { getDb } from "@/db";
import { requireUser } from "@/lib/dal";
import { asOfDate, computeAudience, computeDailyViews, computeOverview, computePlatforms, computePosts } from "./compute";
import { loadDataset, type DataSource } from "./live";
import type { ReportData } from "@/lib/reports/build";
import { reportDataFrom } from "@/lib/reports/data";
import { sortPosts } from "./sort";
import type { Audience, DailyViews, Overview, Platform, Post, PostQuery } from "./types";

/** Loaded once per request. */
const imported = cache(async () => {
  const user = await requireUser();
  const loaded = await loadDataset(getDb(), user.id);
  const asOf = loaded && asOfDate(loaded.dataset);
  return loaded && asOf ? { ...loaded, asOf } : null;
});

/** The imported numbers; only call after hasData() returned true. */
async function data() {
  const d = await imported();
  if (!d) throw new Error("No imported data yet: check hasData() before reading the dashboard's numbers.");
  return d;
}

/** Whether any of the person's platforms has imported numbers yet. */
export async function hasData(): Promise<boolean> {
  return (await imported()) != null;
}

/** Where the dashboard's numbers come from, for the notice in the shell. */
export async function getDataSource(): Promise<DataSource> {
  return (await imported())?.source ?? "sample";
}

/** The date the numbers are current as of (ISO). */
export async function getAsOf(): Promise<string> {
  return (await data()).asOf;
}

export async function getOverview(): Promise<Overview> {
  const d = await data();
  return computeOverview(d.dataset, d.asOf);
}

export async function getDailyViews(): Promise<DailyViews> {
  const d = await data();
  return computeDailyViews(d.dataset, d.asOf);
}

export async function getPlatforms(): Promise<Platform[]> {
  const d = await data();
  return computePlatforms(d.dataset, d.asOf);
}

export async function getPlatform(id: string): Promise<Platform | null> {
  return (await getPlatforms()).find((p) => p.id === id) ?? null;
}

export async function getPosts(q: PostQuery = {}): Promise<Post[]> {
  const d = await data();
  const list = computePosts(d.dataset).filter((p) => (!q.platform || p.platform === q.platform) && (!q.kind || p.kind === q.kind));
  return sortPosts(list, q.sort ?? "views");
}

export async function getAudience(): Promise<Audience> {
  const d = await data();
  return computeAudience(d.dataset, d.asOf);
}

/**
 * Everything a report needs, for the signed-in user, or null before any import
 * (reports never fall back to sample numbers). Loads once (also outside React rendering, e.g. route handlers).
 */
export async function getReportData(): Promise<ReportData | null> {
  const d = await imported();
  return d ? reportDataFrom(d.dataset, d.asOf) : null;
}
