import { computeAudience, computeDailyViews, computeOverview, computePlatforms, computePosts, type Dataset } from "@/lib/data/compute";
import type { ReportData } from "./build";

/** Report data straight from a user's imported rows (used where there is no session, e.g. the weekly email). */
export function reportDataFrom(dataset: Dataset, asOf: string): ReportData {
  return {
    asOf,
    sample: false,
    overview: computeOverview(dataset, asOf),
    daily: computeDailyViews(dataset, asOf),
    platforms: computePlatforms(dataset, asOf),
    posts: computePosts(dataset),
    audience: computeAudience(dataset, asOf),
  };
}
