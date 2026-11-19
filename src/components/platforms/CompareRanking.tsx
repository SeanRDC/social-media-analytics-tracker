"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Icon } from "@/components/icons/Icon";
import { useRange } from "@/components/shell/RangeProvider";
import { SegmentedControl } from "@/components/shell/SegmentedControl";
import { useFlip } from "@/hooks/useFlip";
import type { Platform, Range } from "@/lib/data/types";
import { formatCompact, formatPercent, formatSigned, NO_DATA } from "@/lib/format";
import s from "./Platforms.module.css";

type Metric = "engagement" | "growth" | "views";

const METRICS = [
  { value: "engagement", label: "Engagement" },
  { value: "growth", label: "Growth" },
  { value: "views", label: "Views" },
] as const satisfies readonly { value: Metric; label: string }[];

function read(p: Platform, m: Metric, range: Range): number | null {
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
        // platforms that did not report this number go last, never ranked as zero
        .sort((a, b) => (b.v ?? -Infinity) - (a.v ?? -Infinity)),
    [platforms, metric, range],
  );
  const reported = ranked.filter((r): r is { p: Platform; v: number } => r.v !== null);
  const max = Math.max(...reported.map((r) => r.v), 1);
  const weight = (r: { p: Platform }) => (metric === "engagement" ? (r.p.followers ?? 0) : 1);
  const weights = reported.reduce((s, r) => s + weight(r), 0);
  const avg = weights ? reported.reduce((s, r) => s + r.v * weight(r), 0) / weights : 0;
  const total = reported.reduce((s, r) => s + r.v, 0);
  const [first, second] = reported;
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
              <i style={{ transform: `scaleX(${(v ?? 0) / max})`, background: `var(--p-${p.id})` }} />
            </span>
            <b className={s.rkVal} title={v === null ? "Not reported yet" : undefined}>
              {v === null ? NO_DATA : show(v, metric)}
            </b>
          </li>
        ))}
      </ol>

      {first && second && second.v > 0 && total > 0 && (
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
                {first.p.name} brought <b>{Math.round((first.v / total) * 100)}%</b> of your new followers in the last {range} days.
              </>
            )}
            {metric === "views" && (
              <>
                {first.p.name} drove <b>{Math.round((first.v / total) * 100)}%</b> of your views this month.
              </>
            )}
          </span>
        </p>
      )}
    </section>
  );
}
