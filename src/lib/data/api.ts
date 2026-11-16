/**
 * The data layer the dashboard depends on. Each function answers for the
 * signed-in user from imported numbers, or from sample data until one of their
 * platforms has been imported. Reads the session: call inside Suspense.
 */
import "server-only";
import { cache } from "react";
import { getDb } from "@/db";
import { requireUser } from "@/lib/dal";
import { asOfDate, computeAudience, computeDailyViews, computeOverview, computePlatforms, computePosts } from "./compute";
import { loadDataset, type DataSource } from "./live";
import type { ReportData } from "@/lib/reports/build";
import { reportDataFrom } from "@/lib/reports/data";
import * as sample from "./sample-api";
import { sortPosts } from "./sort";
import type { Audience, DailyViews, Overview, Platform, PlatformId, Post, PostKind, PostSort } from "./types";

/** Loaded once per request. */
const imported = cache(async () => {
  const user = await requireUser();
  const loaded = await loadDataset(getDb(), user.id);
  const asOf = loaded && asOfDate(loaded.dataset);
  return loaded && asOf ? { ...loaded, asOf } : null;
});

/** Where the dashboard's numbers come from, for the notice in the shell. */
export async function getDataSource(): Promise<DataSource> {
  return (await imported())?.source ?? "sample";
}

/** The date the numbers are current as of (ISO). */
export async function getAsOf(): Promise<string> {
  return (await imported())?.asOf ?? sample.getAsOf();
}

export async function getOverview(): Promise<Overview> {
  const d = await imported();
  return d ? computeOverview(d.dataset, d.asOf) : sample.getOverview();
}

export async function getDailyViews(): Promise<DailyViews> {
  const d = await imported();
  return d ? computeDailyViews(d.dataset, d.asOf) : sample.getDailyViews();
}

export async function getPlatforms(): Promise<Platform[]> {
  const d = await imported();
  return d ? computePlatforms(d.dataset, d.asOf) : sample.getPlatforms();
}

export async function getPlatform(id: string): Promise<Platform | null> {
  return (await getPlatforms()).find((p) => p.id === id) ?? null;
}

export interface PostQuery {
  platform?: PlatformId;
  kind?: PostKind;
  sort?: PostSort;
}

export async function getPosts(q: PostQuery = {}): Promise<Post[]> {
  const d = await imported();
  if (!d) return sample.getPosts(q);
  const list = computePosts(d.dataset).filter((p) => (!q.platform || p.platform === q.platform) && (!q.kind || p.kind === q.kind));
  return sortPosts(list, q.sort ?? "views");
}

export async function getAudience(): Promise<Audience> {
  const d = await imported();
  return d ? computeAudience(d.dataset, d.asOf) : sample.getAudience();
}

/** Everything a report needs, for the signed-in user. Loads once (also outside React rendering, e.g. route handlers). */
export async function getReportData(): Promise<ReportData> {
  const d = await imported();
  if (d) return reportDataFrom(d.dataset, d.asOf);
  const [asOf, overview, daily, platforms, posts, audience] = await Promise.all([
    sample.getAsOf(),
    sample.getOverview(),
    sample.getDailyViews(),
    sample.getPlatforms(),
    sample.getPosts(),
    sample.getAudience(),
  ]);
  return { asOf, sample: true, overview, daily, platforms, posts, audience };
}
