import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentLibrary } from "@/components/content/ContentLibrary";
import { NoData } from "@/components/ui/NoData";
import { getAsOf, getPosts, hasData } from "@/lib/data/api";

export const metadata: Metadata = { title: "Content" };

export default async function ContentPage() {
  if (!(await hasData())) return <NoData />;
  const [posts, asOf] = await Promise.all([getPosts(), getAsOf()]);
  return (
    // the library reads ?post= from the URL, which is only known per request
    <Suspense>
      <ContentLibrary posts={posts} asOf={asOf} />
    </Suspense>
  );
}
