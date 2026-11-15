import type { Metadata } from "next";
import { GrowthCard } from "@/components/overview/GrowthCard";
import { HeroCard } from "@/components/overview/HeroCard";
import { LiveViewersCard } from "@/components/overview/LiveViewersCard";
import { TopPostsTable } from "@/components/overview/TopPostsTable";
import { getAsOf, getLiveViewers, getOverview, getPlatform, getPosts } from "@/lib/data/api";
import s from "./overview.module.css";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const [overview, live, posts, asOf] = await Promise.all([getOverview(), getLiveViewers(), getPosts(), getAsOf()]);
  const top = await getPlatform(overview.topPlatform);

  return (
    <div className={s.grid}>
      <HeroCard accountName={overview.accountName} connectedCount={overview.connectedCount} metrics={overview.metrics} />
      <div className={s.side}>
        <LiveViewersCard live={live} />
        {top && <GrowthCard week={overview.metrics[7]} weekGrowth={overview.weekGrowth} top={top} />}
      </div>
      <TopPostsTable posts={posts} asOf={asOf} className={s.table} />
    </div>
  );
}
