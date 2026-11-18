import type { Metadata } from "next";
import { DailyViewsCard } from "@/components/overview/DailyViewsCard";
import { GrowthCard } from "@/components/overview/GrowthCard";
import { KpiTiles, SummaryStatement } from "@/components/overview/Summary";
import { TopPostsTable } from "@/components/overview/TopPostsTable";
import { getAsOf, getDailyViews, getOverview, getPlatform, getPosts } from "@/lib/data/api";
import s from "./overview.module.css";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const [overview, views, posts, asOf] = await Promise.all([getOverview(), getDailyViews(), getPosts(), getAsOf()]);
  const top = await getPlatform(overview.topPlatform);

  return (
    <div className={s.grid}>
      <div className={s.statement}>
        <SummaryStatement accountName={overview.accountName} connectedCount={overview.connectedCount} metrics={overview.metrics} />
      </div>
      <div className={s.kpis}>
        <KpiTiles metrics={overview.metrics} />
      </div>
      <div className={s.chart}>
        <DailyViewsCard views={views} />
      </div>
      {top && (
        <div className={s.growth}>
          <GrowthCard week={overview.metrics[7]} weekGrowth={overview.weekGrowth} top={top} />
        </div>
      )}
      <TopPostsTable posts={posts} asOf={asOf} className={s.table} />
    </div>
  );
}
