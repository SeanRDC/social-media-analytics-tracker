import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformDetail } from "@/components/platforms/PlatformDetail";
import { getOverview, getPlatform, getPlatforms, getPosts } from "@/lib/data/api";

export async function generateStaticParams() {
  return (await getPlatforms()).map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/platforms/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = await getPlatform(id);
  return { title: p?.name ?? "Platform" };
}

export default async function PlatformPage({ params }: PageProps<"/platforms/[id]">) {
  const { id } = await params;
  const platform = await getPlatform(id);
  if (!platform) notFound();
  const [posts, overview] = await Promise.all([getPosts({ platform: platform.id, sort: "date" }), getOverview()]);
  return <PlatformDetail platform={platform} posts={posts} trendStart={overview.trendStart} />;
}
