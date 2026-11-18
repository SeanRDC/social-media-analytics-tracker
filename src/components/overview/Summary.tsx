"use client";

import type { CSSProperties } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { CountUp } from "@/components/motion/CountUp";
import { useRange } from "@/components/shell/RangeProvider";
import { ArrowButton } from "@/components/ui/ArrowButton";
import type { Metrics, Range } from "@/lib/data/types";
import { formatCompact, formatPercent, formatSigned } from "@/lib/format";
import s from "./Summary.module.css";

/** Growth over the period as a percent of where it started. */
export function growthPercent(m: Metrics): number {
  const before = m.followers - m.followerDelta;
  return before > 0 ? (m.followerDelta / before) * 100 : 0;
}

const signedPct = (n: number) => (n > 0 ? `+${n.toFixed(1)}%` : n < 0 ? `−${(-n).toFixed(1)}%` : "0.0%");

interface StatementProps {
  accountName: string;
  connectedCount: number;
  metrics: Record<Range, Metrics>;
}

/** The period in one sentence, set big, with round badges inline (Ramos-style headline). */
export function SummaryStatement({ accountName, connectedCount, metrics }: StatementProps) {
  const { range } = useRange();
  const m = metrics[range];
  return (
    <section className={`${s.statement} card reveal`} style={{ "--i": 1 } as CSSProperties} aria-labelledby="summary-h">
      <span className={s.eyebrow}>
        {accountName} · {connectedCount} platforms
      </span>
      <h2 id="summary-h" className={s.h}>
        <span className={s.line}>
          <span className={`badges ${s.inlineBadges}`} aria-hidden="true">
            <span className={`badge-round ${s.bA}`}>
              <Icon name="users" size={22} />
            </span>
            <span className={`badge-round ${s.bB}`}>
              <Icon name="chart" size={22} />
            </span>
          </span>
          Your audience
        </span>{" "}
        <span className={s.line}>
          grew <CountUp value={`${growthPercent(m).toFixed(1)}%`} delay={350} className={s.hl} />
        </span>
      </h2>
      <div className={s.foot}>
        <p className={s.sub}>
          {formatSigned(m.followerDelta)} followers in the last {range} days
        </p>
        <ArrowButton href="/reports">View report</ArrowButton>
      </div>
    </section>
  );
}

interface Kpi {
  icon: IconName;
  label: string;
  value: string;
  note: string;
  tone: "cobalt" | "lime" | "lilac" | "ink";
}

/** Four headline numbers as coloured tiles. */
export function KpiTiles({ metrics }: { metrics: Record<Range, Metrics> }) {
  const { range } = useRange();
  const m = metrics[range];
  const kpis: Kpi[] = [
    { icon: "users", label: "Followers", value: formatCompact(m.followers), note: `${formatSigned(m.followerDelta)} this period`, tone: "cobalt" },
    { icon: "eye", label: "Views", value: formatCompact(m.views), note: `${signedPct(m.viewsChange)} vs last period`, tone: "lime" },
    { icon: "heart", label: "Engagement", value: formatPercent(m.engagement), note: `${m.engagementChange >= 0 ? "+" : "−"}${Math.abs(m.engagementChange).toFixed(1)} pts`, tone: "lilac" },
    { icon: "grid", label: "Posts", value: String(m.posts), note: `in ${range} days`, tone: "ink" },
  ];
  return (
    <ul className={s.tiles} aria-label="Key numbers">
      {kpis.map((k, i) => (
        <li key={k.label} className={`${s.tile} ${s[k.tone]} lift reveal`} style={{ "--i": i + 2 } as CSSProperties} aria-label={`${k.label}: ${k.value}`}>
          <div className={s.tileTop}>
            <span className={s.tileIcon} aria-hidden="true">
              <Icon name={k.icon} size={18} />
            </span>
            <span className={s.tileLabel}>{k.label}</span>
          </div>
          <CountUp value={k.value} delay={450} className={s.tileVal} />
          <span className={s.tileNote}>{k.note}</span>
        </li>
      ))}
    </ul>
  );
}
