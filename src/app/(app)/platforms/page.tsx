import type { Metadata } from "next";
import { CompareRanking } from "@/components/platforms/CompareRanking";
import { PlatformCards } from "@/components/platforms/PlatformCards";
import s from "@/components/platforms/Platforms.module.css";
import { NoData } from "@/components/ui/NoData";
import { getPlatformOrder, getPlatforms, hasData } from "@/lib/data/api";
import { inOrder } from "@/lib/platformOrder";
import { savePlatformOrder } from "@/app/actions/preferences";

export const metadata: Metadata = { title: "Platforms" };

export default async function PlatformsPage() {
  if (!(await hasData())) return <NoData />;
  const [platforms, order] = await Promise.all([getPlatforms(), getPlatformOrder()]);
  return (
    <div className={s.layout}>
      <CompareRanking platforms={platforms} />
      <PlatformCards platforms={inOrder(platforms, order)} onSaveOrder={savePlatformOrder} />
    </div>
  );
}
