import type { Metadata } from "next";
import { GrowthCard } from "@/components/overview/GrowthCard";
import { HeroCard } from "@/components/overview/HeroCard";
import { DailyViewsCard } from "@/components/overview/DailyViewsCard";
import { TopPostsTable } from "@/components/overview/TopPostsTable";
import { getAsOf, getDailyViews, getOverview, getPlatform, getPosts } from "@/lib/data/api";
import s from "./overview.module.css";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const [overview, views, posts, asOf] = await Promise.all([getOverview(), getDailyViews(), getPosts(), getAsOf()]);
  const top = await getPlatform(overview.topPlatform);

  return (
    <div className={s.grid}>
      <HeroCard accountName={overview.accountName} connectedCount={overview.connectedCount} metrics={overview.metrics} />
      <div className={s.side}>
        <DailyViewsCard views={views} />
        {top && <GrowthCard week={overview.metrics[7]} weekGrowth={overview.weekGrowth} top={top} />}
      </div>
      <TopPostsTable posts={posts} asOf={asOf} className={s.table} />
    </div>
  );
}
