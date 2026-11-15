"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { PlatformPill } from "@/components/ui/PlatformPill";
import { SortMenu } from "@/components/ui/SortMenu";
import { SORT_LABELS, sortPosts } from "@/lib/data/sort";
import type { Post, PostSort } from "@/lib/data/types";
import { formatCompact, formatDate, formatDuration, formatPercent } from "@/lib/format";
import s from "./TopPostsTable.module.css";

const OPTIONS = (Object.keys(SORT_LABELS) as PostSort[]).map((value) => ({ value, label: SORT_LABELS[value] }));

export function TopPostsTable({ posts, className = "" }: { posts: Post[]; className?: string }) {
  const [sort, setSort] = useState<PostSort>("views");
  const rows = useMemo(() => sortPosts(posts, sort), [posts, sort]);
  const rowEls = useRef(new Map<string, HTMLTableRowElement>());
  const before = useRef(new Map<string, number>());

  const choose = (next: PostSort) => {
    // FLIP: remember where every row was before the order changes
    rowEls.current.forEach((el, id) => before.current.set(id, el.getBoundingClientRect().top));
    setSort(next);
  };

  useLayoutEffect(() => {
    if (before.current.size === 0) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rowEls.current.forEach((el, id) => {
      const was = before.current.get(id);
      if (was == null || reduce || typeof el.animate !== "function") return;
      const dy = was - el.getBoundingClientRect().top;
      if (dy) el.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], { duration: 450, easing: "cubic-bezier(.16,1,.3,1)" });
    });
    before.current.clear();
  }, [sort]);

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
              ref={(el) => {
                if (el) rowEls.current.set(p.id, el);
                else rowEls.current.delete(p.id);
              }}
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
