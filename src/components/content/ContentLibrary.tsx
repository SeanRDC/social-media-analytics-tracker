"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type CSSProperties } from "react";
import { Icon } from "@/components/icons/Icon";
import { useRange } from "@/components/shell/RangeProvider";
import { SegmentedControl } from "@/components/shell/SegmentedControl";
import { PlatformPill } from "@/components/ui/PlatformPill";
import { SortMenu } from "@/components/ui/SortMenu";
import { useFlip } from "@/hooks/useFlip";
import { SORT_LABELS, postsInRange, sortPosts } from "@/lib/data/sort";
import type { PlatformId, Post, PostKind, PostSort } from "@/lib/data/types";
import { formatCompact, formatDate, formatPercent } from "@/lib/format";
import { PLATFORM_NAMES } from "@/lib/platforms";
import { PostSheet } from "./PostSheet";
import s from "./ContentLibrary.module.css";

type Kind = "all" | PostKind;
const KINDS = [
  { value: "all", label: "All" },
  { value: "video", label: "Videos" },
  { value: "short", label: "Shorts" },
  { value: "reel", label: "Reels" },
  { value: "post", label: "Posts" },
] as const satisfies readonly { value: Kind; label: string }[];

const SORTS = (Object.keys(SORT_LABELS) as PostSort[]).map((value) => ({ value, label: SORT_LABELS[value] }));

export function ContentLibrary({ posts, asOf }: { posts: Post[]; asOf: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { range } = useRange();
  const [kind, setKind] = useState<Kind>("all");
  const [platform, setPlatform] = useState<"all" | PlatformId>("all");
  const [sort, setSort] = useState<PostSort>("views");
  const linked = search.get("post");
  const [openId, setOpenId] = useState<string | null>(posts.some((p) => p.id === linked) ? linked : null);
  const { register, capture } = useFlip<HTMLLIElement>(sort);

  const platforms = useMemo(() => [...new Set(posts.map((p) => p.platform))], [posts]);
  const shown = useMemo(
    () =>
      sortPosts(
        postsInRange(posts, range, asOf).filter((p) => (kind === "all" || p.kind === kind) && (platform === "all" || p.platform === platform)),
        sort,
      ),
    [posts, range, asOf, kind, platform, sort],
  );
  const open = posts.find((p) => p.id === openId) ?? null;

  const openPost = (id: string) => {
    setOpenId(id);
    router.replace(`${pathname}?post=${id}`, { scroll: false });
  };
  const closePost = () => {
    setOpenId(null);
    router.replace(pathname, { scroll: false });
  };

  return (
    <>
      <div className={`${s.bar} reveal`} style={{ "--i": 1 } as CSSProperties}>
        <div className={s.scroll}>
          <SegmentedControl label="Format" options={KINDS} value={kind} onChange={setKind} />
        </div>
        <label className={s.select}>
          <span className="sr-only">Platform</span>
          <select aria-label="Platform" value={platform} onChange={(e) => setPlatform(e.target.value as "all" | PlatformId)}>
            <option value="all">All platforms</option>
            {platforms.map((id) => (
              <option key={id} value={id}>
                {PLATFORM_NAMES[id]}
              </option>
            ))}
          </select>
          <Icon name="down" size={13} />
        </label>
        <span className={s.count} aria-live="polite">
          {shown.length} {shown.length === 1 ? "post" : "posts"}
        </span>
        <SortMenu
          label="Sort posts"
          value={sort}
          options={SORTS}
          onChange={(v) => {
            capture();
            setSort(v);
          }}
        />
      </div>

      {shown.length === 0 ? (
        <div className={`${s.empty} glass rim reveal`}>
          <Icon name="filter" size={22} />
          <p>No posts match these filters in the last {range} days.</p>
          <button
            type="button"
            className={s.reset}
            onClick={() => {
              setKind("all");
              setPlatform("all");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className={s.grid} aria-label="Posts">
          {shown.map((p, i) => (
            <li key={p.id} ref={register(p.id)} className="reveal" style={{ "--i": Math.min(i, 8) + 2 } as CSSProperties}>
              <button type="button" className={`${s.card} glass rim sweep lift`} onClick={() => openPost(p.id)}>
                <span className={s.media}>
                  <i className={`thumb thumb-${p.thumb} ${s.thumb}`} aria-hidden="true" />
                  <span className={s.kind}>{KINDS.find((k) => k.value === p.kind)?.label.replace(/s$/, "")}</span>
                </span>
                <span className={s.meta}>
                  <PlatformPill id={p.platform} plain />
                  <span className="muted">{formatDate(p.publishedAt)}</span>
                </span>
                <span className={s.title}>{p.title}</span>
                <span className={s.stats}>
                  <span>
                    <b>{formatCompact(p.views)}</b> views
                  </span>
                  <span>
                    <b>{formatPercent(p.engagement)}</b> engaged
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <PostSheet post={open} onClose={closePost} />
    </>
  );
}
