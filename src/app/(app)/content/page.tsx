import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentLibrary } from "@/components/content/ContentLibrary";
import { getAsOf, getPosts } from "@/lib/data/api";

export const metadata: Metadata = { title: "Content" };

export default async function ContentPage() {
  const [posts, asOf] = await Promise.all([getPosts(), getAsOf()]);
  return (
    // the library reads ?post= from the URL, which is only known per request
    <Suspense>
      <ContentLibrary posts={posts} asOf={asOf} />
    </Suspense>
  );
}
