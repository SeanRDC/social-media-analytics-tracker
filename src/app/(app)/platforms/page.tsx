import type { Metadata } from "next";
import { CompareRanking } from "@/components/platforms/CompareRanking";
import { PlatformCards } from "@/components/platforms/PlatformCards";
import s from "@/components/platforms/Platforms.module.css";
import { NoData } from "@/components/ui/NoData";
import { getPlatforms, hasData } from "@/lib/data/api";

export const metadata: Metadata = { title: "Platforms" };

export default async function PlatformsPage() {
  if (!(await hasData())) return <NoData />;
  const platforms = await getPlatforms();
  return (
    <div className={s.layout}>
      <CompareRanking platforms={platforms} />
      <PlatformCards platforms={platforms} />
    </div>
  );
}
