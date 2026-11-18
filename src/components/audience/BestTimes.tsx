"use client";

import { useState, type CSSProperties } from "react";
import { Icon } from "@/components/icons/Icon";
import s from "./Audience.module.css";

const FULL_DAY: Record<string, string> = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };

interface Props {
  slotLabels: string[];
  days: { day: string; slots: number[] }[];
}

/** Heatmap of when the audience is most active. One hue, light to strong. */
export function BestTimes({ slotLabels, days }: Props) {
  const [focus, setFocus] = useState<{ d: number; t: number } | null>(null);
  let best = { d: 0, t: 0, v: -1 };
  days.forEach((row, d) => row.slots.forEach((v, t) => v > best.v && (best = { d, t, v })));
  const bestLabel = `${FULL_DAY[days[best.d].day]} at ${slotLabels[best.t]}`;
  const readout = focus
    ? `${FULL_DAY[days[focus.d].day]}, ${slotLabels[focus.t]} · ${Math.round(days[focus.d].slots[focus.t] * 100)}% of your best slot`
    : "Hover or tap a cell to compare";

  return (
    <section className={`${s.card} ${s.heatCard} card reveal`} style={{ "--i": 3 } as CSSProperties} aria-labelledby="best-h">
      <div className={s.head}>
        <h2 id="best-h" className={s.h2}>
          Best time to post
        </h2>
        <span className={s.best}>
          <Icon name="sparkle" size={14} />
          <b>{bestLabel}</b>
        </span>
      </div>
      <div className={s.heat} style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))` }} onPointerLeave={() => setFocus(null)}>
        <span />
        {days.map((r) => (
          <span key={r.day} className={s.axis}>
            {r.day}
          </span>
        ))}
        {slotLabels.map((label, t) => (
          <div key={label} className={s.heatRow}>
            <span className={s.axis}>{label}</span>
            {days.map((r, d) => {
              const v = r.slots[t];
              const isBest = d === best.d && t === best.t;
              return (
                <button
                  key={r.day}
                  type="button"
                  className={`${s.cell} ${isBest ? s.cellBest : ""}`}
                  style={{ "--v": v, "--i": d + t } as CSSProperties}
                  aria-label={`${FULL_DAY[r.day]}, ${label}: ${Math.round(v * 100)}% of your best slot${isBest ? ", best" : ""}`}
                  onPointerEnter={() => setFocus({ d, t })}
                  onFocus={() => setFocus({ d, t })}
                  onBlur={() => setFocus(null)}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className={s.readout} role="status">
        {readout}
      </p>
    </section>
  );
}
