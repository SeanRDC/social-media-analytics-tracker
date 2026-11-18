"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Icon } from "@/components/icons/Icon";
import { useRange } from "@/components/shell/RangeProvider";
import { SegmentedControl } from "@/components/shell/SegmentedControl";
import { useFlip } from "@/hooks/useFlip";
import type { Platform, Range } from "@/lib/data/types";
import { formatCompact, formatPercent, formatSigned } from "@/lib/format";
import s from "./Platforms.module.css";

type Metric = "engagement" | "growth" | "views";

const METRICS = [
  { value: "engagement", label: "Engagement" },
  { value: "growth", label: "Growth" },
  { value: "views", label: "Views" },
] as const satisfies readonly { value: Metric; label: string }[];

function read(p: Platform, m: Metric, range: Range): number {
  if (m === "engagement") return p.engagement;
  if (m === "growth") return p.followerGrowth[range];
  return p.views30;
}

function show(v: number, m: Metric): string {
  if (m === "engagement") return formatPercent(v);
  if (m === "growth") return formatSigned(v);
  return formatCompact(v);
}

export function CompareRanking({ platforms }: { platforms: Platform[] }) {
  const { range } = useRange();
  const [metric, setMetric] = useState<Metric>("engagement");
  const { register, capture } = useFlip<HTMLLIElement>(`${metric}-${range}`);
  const ranked = useMemo(
    () =>
      platforms
        .filter((p) => p.status === "connected")
        .map((p) => ({ p, v: read(p, metric, range) }))
        .sort((a, b) => b.v - a.v),
    [platforms, metric, range],
  );
  const max = Math.max(...ranked.map((r) => r.v), 1);
  const avg = ranked.reduce((s, r) => s + r.v * (metric === "engagement" ? r.p.followers : 1), 0) / (metric === "engagement" ? ranked.reduce((s, r) => s + r.p.followers, 0) : ranked.length);
  const [first, second] = ranked;
  const caption = metric === "views" ? "Views, last 30 days" : metric === "growth" ? `New followers, last ${range} days` : "Engagement rate, last 30 days";

  return (
    <section className={`${s.card} ${s.compare} card reveal`} style={{ "--i": 2 } as CSSProperties} aria-labelledby="compare-h">
      <div className={s.cardHead}>
        <div>
          <h2 id="compare-h" className={s.h2}>
            Compare platforms
          </h2>
          <p className={s.caption}>{caption}</p>
        </div>
        <SegmentedControl
          label="Compare by"
          size="sm"
          options={METRICS}
          value={metric}
          onChange={(m) => {
            capture();
            setMetric(m);
          }}
        />
      </div>

      <ol className={s.rank} aria-label={`Ranking by ${metric}`}>
        {ranked.map(({ p, v }) => (
          <li key={p.id} ref={register(p.id)} data-platform={p.id} className={s.rk}>
            <span className={s.rkName}>
              <span className="dot" style={{ background: `var(--p-${p.id})` }} />
              {p.name}
            </span>
            <span className={s.track} aria-hidden="true">
              <i style={{ transform: `scaleX(${v / max})`, background: `var(--p-${p.id})` }} />
            </span>
            <b className={s.rkVal}>{show(v, metric)}</b>
          </li>
        ))}
      </ol>

      {first && second && (
        <p className={s.insight}>
          <Icon name="sparkle" size={16} />
          <span>
            {metric === "engagement" && (
              <>
                {first.p.name} engagement is <b>{(first.v / second.v).toFixed(1)}×</b> {second.p.name}. Average across platforms: {formatPercent(avg)}.
              </>
            )}
            {metric === "growth" && (
              <>
                {first.p.name} brought <b>{Math.round((first.v / ranked.reduce((s, r) => s + r.v, 0)) * 100)}%</b> of your new followers in the last {range} days.
              </>
            )}
            {metric === "views" && (
              <>
                {first.p.name} drove <b>{Math.round((first.v / ranked.reduce((s, r) => s + r.v, 0)) * 100)}%</b> of your views this month.
              </>
            )}
          </span>
        </p>
      )}
    </section>
  );
}
