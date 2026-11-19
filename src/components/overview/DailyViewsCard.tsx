"use client";

import type { CSSProperties } from "react";
import { LineChart } from "@/components/charts/LineChart";
import { niceTicks } from "@/lib/chart";
import type { DailyViews } from "@/lib/data/types";
import { formatCompact, formatNumber, NO_DATA } from "@/lib/format";
import s from "./Cards.module.css";

const FULL_DAY: Record<string, string> = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };

/** Views per day across every platform: this week against last week. */
export function DailyViewsCard({ views }: { views: DailyViews }) {
  // only days the platforms reported count; unreported days leave a gap in the line
  const reported = (xs: (number | null)[]) => xs.filter((v): v is number => v !== null);
  const thisWeek = reported(views.thisWeek);
  const peakIndex = thisWeek.length ? views.thisWeek.indexOf(Math.max(...thisWeek)) : -1;
  const peakValue = peakIndex >= 0 ? views.thisWeek[peakIndex]! : null;
  const today = views.thisWeek[views.todayIndex];
  // at least 1 so a week with no views still draws a flat line instead of dividing by zero
  const max = Math.max(1, ...thisWeek, ...reported(views.lastWeek));
  const summary =
    peakValue === null
      ? "No views reported this week yet."
      : `This week peaked at ${formatNumber(peakValue)} on ${FULL_DAY[views.days[peakIndex]]}; today has ${today === null ? "no data yet" : formatNumber(today)}.`;
  const ticks = niceTicks(0, max, 3).filter((t) => t > 0);

  return (
    <section className={`${s.card} card lift reveal`} style={{ "--i": 2 } as CSSProperties} aria-labelledby="views-h">
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
            <i style={{ background: "rgba(20, 20, 22, 0.28)" }} />
            Last week
          </span>
        </span>
      </div>
      {peakValue === null && (
        <p className={s.note} role="status">
          {NO_DATA} No views reported for these two weeks yet.
        </p>
      )}
      <LineChart
        ariaLabel={`Views per day across all platforms. ${summary} Use the arrow keys to compare each day with last week.`}
        series={[
          { key: "last", label: "Last week", values: views.lastWeek, color: "rgba(20, 20, 22, 0.28)" },
          { key: "this", label: "This week", values: views.thisWeek, color: "var(--acc)", area: true },
        ]}
        xCount={views.days.length}
        xLabels={views.days.map((d, i) => ({ i, label: d }))}
        yMin={0}
        yMax={max * 1.12}
        yTicks={ticks.map((t) => ({ value: t, label: formatCompact(t) }))}
        height={240}
        pointLabel={(i) => (i === views.todayIndex ? `${FULL_DAY[views.days[i]]} · today` : FULL_DAY[views.days[i]])}
        formatValue={formatCompact}
        peak={peakValue === null ? undefined : { series: "this", i: peakIndex, label: formatCompact(peakValue) }}
        pulse={{ series: "this", i: views.todayIndex }}
      />
    </section>
  );
}
