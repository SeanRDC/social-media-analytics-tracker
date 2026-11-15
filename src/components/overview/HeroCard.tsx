"use client";

import type { CSSProperties } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { CountUp } from "@/components/motion/CountUp";
import { useRange } from "@/components/shell/RangeProvider";
import { ArrowButton, RoundArrow } from "@/components/ui/ArrowButton";
import type { Metrics, Range } from "@/lib/data/types";
import { formatCompact, formatPercent, formatSigned } from "@/lib/format";
import s from "./HeroCard.module.css";

interface Props {
  accountName: string;
  connectedCount: number;
  metrics: Record<Range, Metrics>;
}

/** Growth over the period as a percent of where it started. */
export function growthPercent(m: Metrics): number {
  return (m.followerDelta / (m.followers - m.followerDelta)) * 100;
}

export function HeroCard({ accountName, connectedCount, metrics }: Props) {
  const { range } = useRange();
  const m = metrics[range];
  const kpis: { icon: IconName; value: string; label: string }[] = [
    { icon: "users", value: formatCompact(m.followers), label: `Followers ${formatSigned(m.followerDelta)}` },
    { icon: "eye", value: formatCompact(m.views), label: "Views" },
    { icon: "heart", value: formatPercent(m.engagement), label: "Engagement" },
    { icon: "grid", value: String(m.posts), label: "Posts" },
  ];

  return (
    <section className={`${s.hero} rim sweep reveal`} style={{ "--i": 1 } as CSSProperties} aria-labelledby="hero-h">
      <div className={s.core}>
        <div className={s.bloom} aria-hidden="true" />
        <i className={`lens ${s.lens}`} aria-hidden="true" />
        <div className={s.scrim} aria-hidden="true" />

        <div className={s.txt}>
          <span className={s.tag}>
            {accountName} · {connectedCount} platforms
          </span>
          <h2 id="hero-h" className={s.h}>
            Your audience grew <CountUp value={`${growthPercent(m).toFixed(1)}%`} delay={350} />
          </h2>
          <p className={s.sub}>in the last {range} days</p>
          <ArrowButton href="/reports" className={s.btn}>
            View report
          </ArrowButton>
        </div>

        <div className={`${s.kpis} glass rim`}>
          {kpis.map((k) => (
            <div key={k.icon} className={s.kpi}>
              <span className={s.chip} aria-hidden="true">
                <Icon name={k.icon} size={15} />
              </span>
              <div className={s.kv}>
                <CountUp value={k.value} delay={450} className={s.val} />
                <small>{k.label}</small>
              </div>
            </div>
          ))}
          <RoundArrow href="/reports" label="Open full report" className={s.go} />
        </div>
      </div>
    </section>
  );
}
