import type { CSSProperties } from "react";
import type { Post } from "@/lib/data/types";

/** The post's own thumbnail when the platform provides one, over the placeholder art. */
export function PostThumb({ post, className = "" }: { post: Pick<Post, "thumb" | "thumbnailUrl">; className?: string }) {
  const style: CSSProperties | undefined = post.thumbnailUrl
    ? { backgroundImage: `url(${JSON.stringify(post.thumbnailUrl)})`, backgroundSize: "cover", backgroundPosition: "center" }
    : undefined;
  return <i className={`thumb thumb-${post.thumb} ${className}`} style={style} aria-hidden="true" />;
}
