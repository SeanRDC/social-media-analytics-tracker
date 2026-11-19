"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { CountUp } from "@/components/motion/CountUp";
import { PlatformPill } from "@/components/ui/PlatformPill";
import type { Metrics, Platform } from "@/lib/data/types";
import { formatSigned, NO_DATA, orNoData } from "@/lib/format";
import { growthPercent } from "./Summary";
import s from "./Cards.module.css";

interface Props {
  week: Metrics;
  weekGrowth: { day: string; value: number | null }[];
  top: Platform;
}

export function GrowthCard({ week, weekGrowth, top }: Props) {
  const [day, setDay] = useState<number | null>(null);
  // bars show gains; days that lost followers sit at zero height (the label still says so)
  const max = Math.max(1, ...weekGrowth.map((d) => d.value ?? 0));
  const pct = growthPercent(week);
  const label = (v: number | null) => (v === null ? "no data" : `${formatSigned(v)} followers`);
  const note = day == null ? (week.followerDelta === null ? "no follower changes reported yet" : "followers this week") : `${weekGrowth[day].day} · ${label(weekGrowth[day].value)}`;

  return (
    <section className={`${s.card} ${s.duo} card lift reveal`} style={{ "--i": 3 } as CSSProperties} aria-labelledby="growth-h">
      <div className={s.gw}>
        <h2 id="growth-h" className={s.gwTitle}>
          Latest growth
        </h2>
        <div className={s.bigRow}>
          {week.followerDelta === null ? <span className={s.big}>{NO_DATA}</span> : <CountUp value={formatSigned(week.followerDelta)} delay={450} className={s.big} />}
          {pct !== null && (
            <span className={s.pillUp}>
              {pct >= 0 ? "+" : ""}
              {pct.toFixed(1)}%
            </span>
          )}
        </div>
        <span className={s.note} aria-live="polite">
          {note}
        </span>
        <div className={s.bars} onPointerLeave={() => setDay(null)}>
          {weekGrowth.map((d, i) => (
            <button
              key={d.day}
              type="button"
              className={s.bar}
              style={{ height: `${(Math.max(0, d.value ?? 0) / max) * 100}%`, "--i": i } as CSSProperties}
              aria-label={`${d.day}: ${label(d.value)}`}
              onPointerEnter={() => setDay(i)}
              onFocus={() => setDay(i)}
              onBlur={() => setDay(null)}
            />
          ))}
        </div>
      </div>
      <Link href={`/platforms/${top.id}`} className={s.tile} aria-label={`Top platform: ${top.name}, ${orNoData(top.followers)} ${top.followerNoun}`}>
        <i className={`thumb thumb-a ${s.tileThumb}`} aria-hidden="true" />
        <PlatformPill id={top.id} plain />
        <b className={s.tileVal}>{orNoData(top.followers)}</b>
        <span className={s.tileSub}>Top platform</span>
      </Link>
    </section>
  );
}
