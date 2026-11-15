"use client";

import type { CSSProperties } from "react";
import { LineChart } from "@/components/charts/LineChart";
import { niceTicks } from "@/lib/chart";
import type { DailyViews } from "@/lib/data/types";
import { formatCompact, formatNumber } from "@/lib/format";
import s from "./Cards.module.css";

const FULL_DAY: Record<string, string> = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };

/** Views per day across every platform: this week against last week. */
export function DailyViewsCard({ views }: { views: DailyViews }) {
  const peakIndex = views.thisWeek.indexOf(Math.max(...views.thisWeek));
  const today = views.thisWeek[views.todayIndex];
  const max = Math.max(...views.thisWeek, ...views.lastWeek);
  const ticks = niceTicks(0, max, 3).filter((t) => t > 0);

  return (
    <section className={`${s.card} glass rim sweep lift reveal`} style={{ "--i": 2 } as CSSProperties} aria-labelledby="views-h">
      <div className={s.ct}>
        <h2 id="views-h" className={s.title}>
          <span className={s.live} aria-hidden="true" />
          Views per day
        </h2>
        <span className={s.legend}>
          <span>
            <i style={{ background: "var(--acc)" }} />
            This week
          </span>
          <span>
            <i style={{ background: "var(--acc2)" }} />
            Last week
          </span>
        </span>
      </div>
      <LineChart
        ariaLabel={`Views per day across all platforms. This week peaked at ${formatNumber(views.thisWeek[peakIndex])} on ${FULL_DAY[views.days[peakIndex]]}; today has ${formatNumber(today)}. Use the arrow keys to compare each day with last week.`}
        series={[
          { key: "last", label: "Last week", values: views.lastWeek, color: "var(--acc2)" },
          { key: "this", label: "This week", values: views.thisWeek, color: "var(--acc)", glow: true, area: true },
        ]}
        xCount={views.days.length}
        xLabels={views.days.map((d, i) => ({ i, label: d }))}
        yMin={0}
        yMax={max * 1.12}
        yTicks={ticks.map((t) => ({ value: t, label: formatCompact(t) }))}
        height={128}
        pointLabel={(i) => (i === views.todayIndex ? `${FULL_DAY[views.days[i]]} · today` : FULL_DAY[views.days[i]])}
        formatValue={formatCompact}
        peak={{ series: "this", i: peakIndex, label: formatCompact(views.thisWeek[peakIndex]) }}
        pulse={{ series: "this", i: views.todayIndex }}
      />
    </section>
  );
}
