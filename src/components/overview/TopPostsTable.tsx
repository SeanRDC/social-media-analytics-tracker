"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { PlatformPill } from "@/components/ui/PlatformPill";
import { SortMenu } from "@/components/ui/SortMenu";
import { useFlip } from "@/hooks/useFlip";
import { SORT_LABELS, sortPosts } from "@/lib/data/sort";
import type { Post, PostSort } from "@/lib/data/types";
import { formatCompact, formatDate, formatDuration, formatPercent } from "@/lib/format";
import s from "./TopPostsTable.module.css";

const OPTIONS = (Object.keys(SORT_LABELS) as PostSort[]).map((value) => ({ value, label: SORT_LABELS[value] }));

export function TopPostsTable({ posts, className = "" }: { posts: Post[]; className?: string }) {
  const [sort, setSort] = useState<PostSort>("views");
  const rows = useMemo(() => sortPosts(posts, sort), [posts, sort]);
  const { register, capture } = useFlip<HTMLTableRowElement>(sort);

  const choose = (next: PostSort) => {
    capture();
    setSort(next);
  };

  return (
    <section className={`${s.card} glass rim sweep reveal ${className}`} style={{ "--i": 4 } as React.CSSProperties} aria-labelledby="top-posts-h">
      <div className={s.head}>
        <h2 id="top-posts-h" className={s.h}>
          Your top posts in this period
        </h2>
        <SortMenu label="Sort top posts" value={sort} options={OPTIONS} onChange={choose} />
      </div>
      <table className={s.table}>
        <thead>
          <tr>
            <th scope="col">Post</th>
            <th scope="col" className={s.hidePhone}>Platform</th>
            <th scope="col">Views</th>
            <th scope="col" className={s.hidePhone}>Engagement</th>
            <th scope="col" className={s.hideTablet}>Avg. watch</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr
              key={p.id}
              ref={register(p.id)}
            >
              <td>
                <div className={s.post}>
                  <i className={`thumb thumb-${p.thumb} ${s.thumb}`} aria-hidden="true" />
                  <div className={s.pt}>
                    <h3 className={s.title}>{p.title}</h3>
                    <small>
                      {formatDate(p.publishedAt)}
                      <span className={s.showPhone}> · <PlatformPill id={p.platform} plain /></span>
                    </small>
                  </div>
                </div>
              </td>
              <td className={s.hidePhone}>
                <PlatformPill id={p.platform} />
              </td>
              <td>
                <span className={s.views}>{formatCompact(p.views)}</span>
              </td>
              <td className={s.hidePhone}>{formatPercent(p.engagement)}</td>
              <td className={s.hideTablet}>{formatDuration(p.avgWatchSeconds)}</td>
              <td className={s.actCell}>
                <Link href={`/content?post=${p.id}`} className={s.act} aria-label={`Open details for ${p.title}`}>
                  <Icon name="right" size={15} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
