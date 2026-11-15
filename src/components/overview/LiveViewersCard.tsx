"use client";

import type { CSSProperties } from "react";
import { LineChart } from "@/components/charts/LineChart";
import type { LiveViewers } from "@/lib/data/types";
import { formatCompact, formatNumber } from "@/lib/format";
import s from "./Cards.module.css";

export function LiveViewersCard({ live }: { live: LiveViewers }) {
  const peakIndex = live.today.indexOf(Math.max(...live.today));
  const now = live.today[live.nowIndex];
  const last = live.hours.length - 1;
  const xl = [0, Math.round(last / 3), Math.round((2 * last) / 3), last];

  return (
    <section className={`${s.card} glass rim sweep lift reveal`} style={{ "--i": 2 } as CSSProperties} aria-labelledby="live-h">
      <div className={s.ct}>
        <h2 id="live-h" className={s.title}>
          <span className={s.live} aria-hidden="true" />
          Live viewers right now
        </h2>
        <span className={s.legend}>
          <span>
            <i style={{ background: "var(--acc)" }} />
            Today
          </span>
          <span>
            <i style={{ background: "var(--acc2)" }} />
            Yesterday
          </span>
        </span>
      </div>
      <p className="sr-only">
        {formatNumber(now)} watching now at {live.hours[live.nowIndex]}.
      </p>
      <LineChart
        ariaLabel={`Live viewers by hour. Today peaked at ${formatNumber(live.today[peakIndex])} at ${live.hours[peakIndex]}; ${formatNumber(now)} watching now, versus ${formatNumber(live.yesterday[live.nowIndex])} at the same time yesterday. Use the arrow keys to read each hour.`}
        series={[
          { key: "yesterday", label: "Yesterday", values: live.yesterday, color: "var(--acc2)" },
          { key: "today", label: "Today", values: live.today, color: "var(--acc)", glow: true, area: true },
        ]}
        xCount={live.hours.length}
        xLabels={xl.map((i) => ({ i, label: live.shortHours[i] }))}
        yMin={0}
        yMax={1400}
        yTicks={[
          { value: 500, label: "500" },
          { value: 1000, label: "1K" },
        ]}
        height={128}
        pointLabel={(i) => (i === live.nowIndex ? `${live.hours[i]} · now` : live.hours[i])}
        formatValue={formatNumber}
        peak={{ series: "today", i: peakIndex, label: formatCompact(live.today[peakIndex]) }}
        pulse={{ series: "today", i: live.nowIndex }}
      />
    </section>
  );
}
