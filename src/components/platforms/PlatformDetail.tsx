"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { LineChart } from "@/components/charts/LineChart";
import { Icon } from "@/components/icons/Icon";
import { CountUp } from "@/components/motion/CountUp";
import { useRange } from "@/components/shell/RangeProvider";
import { niceTicks } from "@/lib/chart";
import type { Platform, Post } from "@/lib/data/types";
import { formatCompact, formatDate, formatPercent, formatSigned, NO_DATA, sinceNote } from "@/lib/format";
import s from "./PlatformDetail.module.css";
import { PostThumb } from "@/components/ui/PostThumb";

interface Props {
  platform: Platform;
  posts: Post[];
  trendStart: string;
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function PlatformDetail({ platform: p, posts, trendStart }: Props) {
  const { range } = useRange();
  const color = `var(--p-${p.id})`;

  if (p.status !== "connected") {
    return (
      <section className={`${s.empty} card reveal`}>
        <Link href="/platforms" className={s.back}>
          <Icon name="back" size={15} /> Platforms
        </Link>
        <h2 className={s.emptyH}>{p.name} isn&apos;t connected yet</h2>
        <p className="muted">Connect it to see followers, views and your best posts next to your other platforms.</p>
        <Link href="/onboarding/connect" className={s.cta}>
          <Icon name="plus" size={15} /> Connect {p.name}
        </Link>
      </section>
    );
  }

  const trend = p.trend.filter((v): v is number => v !== null);
  const min = trend.length ? Math.min(...trend) : 0;
  const max = trend.length ? Math.max(...trend) : 1;
  const ticks = niceTicks(min, max, 3);
  // from reported views only; unknown when the platform has not reported views for these 30 days
  const avgViews = p.views30 !== null && p.posts30 ? Math.round(p.views30 / p.posts30) : null;
  const since = sinceNote(p.dataSince);

  return (
    <div className={s.page} style={{ "--pc": color } as CSSProperties}>
      <Link href="/platforms" className={`${s.back} reveal`}>
        <Icon name="back" size={15} /> All platforms
      </Link>

      <section className={`${s.hero} card reveal`} style={{ "--i": 1 } as CSSProperties} aria-labelledby="pd-h">
        <div className={s.heroTop}>
          <span className={s.mark} aria-hidden="true">
            {p.name.charAt(0)}
          </span>
          <div className={s.who}>
            <h2 id="pd-h" className={s.name}>
              {p.name}
            </h2>
            <p className="muted">{p.account}</p>
          </div>
          <span className={s.status}>
            <Icon name="check" size={13} strokeWidth={2} /> Connected
          </span>
        </div>
        <div className={s.bigRow}>
          {p.followers === null ? <span className={s.big}>{NO_DATA}</span> : <CountUp value={formatCompact(p.followers)} delay={300} className={s.big} />}
          <span className={s.noun}>{p.followerNoun}</span>
          <span className={s.delta}>
            {p.followerGrowth[range] === null ? "No follower changes reported yet" : `${formatSigned(p.followerGrowth[range]!)} in ${range} days`}
          </span>
        </div>
        <LineChart
          ariaLabel={`${p.name} ${p.followerNoun} over the last 30 days${trend.length ? `, from ${formatCompact(trend[0])} to ${formatCompact(trend[trend.length - 1])}` : ", none reported yet"}. Days without a reported total are left blank. Use the arrow keys to read each day.`}
          series={[{ key: "f", label: p.followerNoun[0].toUpperCase() + p.followerNoun.slice(1), values: p.trend, color, area: true }]}
          xCount={p.trend.length}
          xLabels={[0, 15, 30].map((i) => ({ i, label: formatDate(addDays(trendStart, i)) }))}
          yMin={min - (max - min) * 0.08}
          yMax={max + (max - min) * 0.08}
          yTicks={ticks.map((t) => ({ value: t, label: formatCompact(t) }))}
          height={220}
          pointLabel={(i) => formatDate(addDays(trendStart, i))}
          formatValue={(v) => v.toLocaleString("en-US")}
          pulse={{ series: "f", i: p.trend.length - 1 }}
        />
      </section>

      <dl className={`${s.stats} reveal`} style={{ "--i": 2 } as CSSProperties}>
        <div>
          <dt>Views · 30 days{since && <small className={s.since}> · {since}</small>}</dt>
          <dd>{p.views30 === null ? NO_DATA : <CountUp value={formatCompact(p.views30)} delay={400} />}</dd>
        </div>
        <div>
          <dt>Engagement</dt>
          <dd>{p.engagement === null ? NO_DATA : <CountUp value={formatPercent(p.engagement)} delay={400} />}</dd>
        </div>
        <div>
          <dt>Posts · 30 days</dt>
          <dd>
            <CountUp value={String(p.posts30)} delay={400} />
          </dd>
        </div>
        <div>
          <dt>Views per post</dt>
          <dd>{avgViews === null ? NO_DATA : <CountUp value={formatCompact(avgViews)} delay={400} />}</dd>
        </div>
      </dl>

      <section className={`${s.posts} card reveal`} style={{ "--i": 3 } as CSSProperties} aria-labelledby="pd-posts">
        <h2 id="pd-posts" className={s.h2}>
          Recent posts
        </h2>
        {posts.length === 0 ? (
          <p className="muted">No posts in the last 30 days.</p>
        ) : (
          <ul className={s.list}>
            {posts.map((post) => (
              <li key={post.id}>
                <Link href={`/content?post=${post.id}`} className={s.row}>
                  <PostThumb post={post} className={s.thumb} />
                  <span className={s.rowText}>
                    <b>{post.title}</b>
                    <small>
                      {formatDate(post.publishedAt)} · {post.kind}
                    </small>
                  </span>
                  <span className={s.rowNum}>
                    {formatCompact(post.views)}
                    <small>{formatPercent(post.engagement)}</small>
                  </span>
                  <Icon name="right" size={15} className={s.chev} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
