import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformDetail } from "@/components/platforms/PlatformDetail";
import { NoData } from "@/components/ui/NoData";
import { getOverview, getPlatform, getPosts, hasData } from "@/lib/data/api";
import { PLATFORM_ORDER } from "@/lib/data/types";
import { PLATFORM_NAMES } from "@/lib/platforms";

// the list of platforms is fixed; their numbers are per user and load per request
export function generateStaticParams() {
  return PLATFORM_ORDER.map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps<"/platforms/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: PLATFORM_NAMES[id as keyof typeof PLATFORM_NAMES] ?? "Platform" };
}

export default async function PlatformPage({ params }: PageProps<"/platforms/[id]">) {
  const { id } = await params;
  if (!(await hasData())) return <NoData />;
  const platform = await getPlatform(id);
  if (!platform) notFound();
  const [posts, overview] = await Promise.all([getPosts({ platform: platform.id, sort: "date" }), getOverview()]);
  return <PlatformDetail platform={platform} posts={posts} trendStart={overview.trendStart} />;
}
