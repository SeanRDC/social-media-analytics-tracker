"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useElementWidth } from "@/hooks/useElementWidth";
import { areaPath, linePath, linearScale, nearestIndex, smoothPath, type Point } from "@/lib/chart";
import s from "./LineChart.module.css";

export interface Series {
  key: string;
  label: string;
  /**
   * May be shorter than `xCount` (e.g. today stops at the current hour). null
   * marks a day the platform did not report: the line breaks there instead of
   * dropping to zero.
   */
  values: (number | null)[];
  color: string;
  glow?: boolean;
  area?: boolean;
}

interface Props {
  series: Series[];
  xCount: number;
  xLabels: { i: number; label: string }[];
  yMin: number;
  yMax: number;
  yTicks: { value: number; label: string }[];
  height?: number;
  smooth?: boolean;
  /** Title line of the tooltip for index i. */
  pointLabel: (i: number) => string;
  formatValue: (v: number) => string;
  /** Static label pill, hidden while the readout is showing. */
  peak?: { series: string; i: number; label: string };
  /** Pulsing dot, e.g. "now". */
  pulse?: { series: string; i: number };
  ariaLabel: string;
}

const PAD = { l: 28, r: 10, t: 26, b: 18 };

export function LineChart({ series, xCount, xLabels, yMin, yMax, yTicks, height = 130, smooth = true, pointLabel, formatValue, peak, pulse, ariaLabel }: Props) {
  const { ref, width } = useElementWidth<HTMLDivElement>(300);
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");
  const W = width;
  const H = height;
  const step = (W - PAD.l - PAD.r) / (xCount - 1);
  const x = (i: number) => PAD.l + i * step;
  const y = linearScale(yMin, yMax, H - PAD.b, PAD.t);
  /** Unbroken stretches of reported values, each drawn as its own line. */
  const runs = (vals: (number | null)[]) => {
    const out: { from: number; to: number; pts: Point[] }[] = [];
    let cur: (typeof out)[number] | null = null;
    vals.forEach((v, i) => {
      if (v == null) {
        cur = null;
        return;
      }
      if (!cur) out.push((cur = { from: i, to: i, pts: [] }));
      cur.to = i;
      cur.pts.push([x(i), y(v)]);
    });
    return out;
  };
  // a lone reported day still shows as a dot-sized stroke
  const path = (p: Point[]) => (p.length === 1 ? `M${p[0][0]},${p[0][1]}h0.01` : smooth ? smoothPath(p, PAD.t, H - PAD.b) : linePath(p));
  const at = (se: Series | undefined, i: number) => (se ? (se.values[i] ?? null) : null);
  const byKey = (k: string) => series.find((se) => se.key === k);

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover(nearestIndex(((e.clientX - r.left) / r.width) * W, PAD.l, step, xCount));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const d = e.key === "ArrowRight" ? 1 : -1;
      setHover((h) => Math.max(0, Math.min(xCount - 1, (h ?? (d > 0 ? -1 : xCount)) + d)));
    } else if (e.key === "Escape") setHover(null);
  };

  const tipTop = hover == null ? 0 : Math.min(...series.map((se) => (se.values[hover] != null ? y(se.values[hover]!) : H)));
  // near the top edge the readout flips below the point so the card never clips it
  const below = tipTop < 64;
  const peakSeries = peak && byKey(peak.series);
  const pulseSeries = pulse && byKey(pulse.series);

  return (
    <div ref={ref} className={`${s.wrap} ${hover != null ? s.on : ""}`}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
        className={s.svg}
      >
        <defs>
          {series.map((se) => (
            <linearGradient key={se.key} id={`${uid}-a-${se.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={se.color} stopOpacity={0.28} />
              <stop offset="1" stopColor={se.color} stopOpacity={0} />
            </linearGradient>
          ))}
          <filter id={`${uid}-glow`} x="-5%" y="-30%" width="110%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {yTicks.map((t) => (
          <g key={t.value}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t.value)} y2={y(t.value)} className={s.grid} />
            <text x={PAD.l - 6} y={y(t.value) + 3} textAnchor="end" className={s.label}>
              {t.label}
            </text>
          </g>
        ))}
        {xLabels.map((l) => (
          <text key={l.i} x={x(l.i)} y={H - 4} textAnchor={l.i === 0 ? "start" : l.i === xCount - 1 ? "end" : "middle"} className={s.label}>
            {l.label}
          </text>
        ))}

        {series.map((se) => (
          <g key={se.key}>
            {runs(se.values).map((r) => {
              const d = path(r.pts);
              return (
                <g key={r.from}>
                  {se.area && r.to > r.from && <path d={areaPath(d, x(r.from), x(r.to), H - PAD.b)} fill={`url(#${uid}-a-${se.key})`} className={s.fade} />}
                  {se.glow && <path d={d} pathLength={1} fill="none" stroke={se.color} strokeWidth={5} strokeOpacity={0.4} filter={`url(#${uid}-glow)`} className={s.draw} />}
                  <path d={d} pathLength={1} fill="none" stroke={se.color} strokeWidth={se.glow ? 2 : 1.6} strokeLinecap="round" className={s.draw} />
                </g>
              );
            })}
          </g>
        ))}

        {peak && at(peakSeries, peak.i) != null && (
          <g className={s.peak}>
            <rect x={x(peak.i) - 18} y={y(at(peakSeries, peak.i)!) - 24} width={36} height={17} rx={8.5} className={s.pill} />
            <text x={x(peak.i)} y={y(at(peakSeries, peak.i)!) - 12} textAnchor="middle" className={s.pillText}>
              {peak.label}
            </text>
            <circle cx={x(peak.i)} cy={y(at(peakSeries, peak.i)!)} r={3} className={s.pill} />
          </g>
        )}
        {pulse && pulseSeries && at(pulseSeries, pulse.i) != null && (
          <g>
            <circle cx={x(pulse.i)} cy={y(at(pulseSeries, pulse.i)!)} r={4} fill={pulseSeries.color} className={s.pulse} />
            <circle cx={x(pulse.i)} cy={y(at(pulseSeries, pulse.i)!)} r={4} fill={pulseSeries.color} className={s.ring} />
          </g>
        )}

        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} className={s.cross} />
            {series.map((se) =>
              se.values[hover] != null ? <circle key={se.key} cx={x(hover)} cy={y(se.values[hover]!)} r={4} fill={se.color} className={s.ring} /> : null,
            )}
          </g>
        )}
      </svg>

      <div
        className={`${s.tip} ${below ? s.below : ""}`}
        role="status"
        aria-live="polite"
        style={hover == null ? undefined : { left: `${Math.max(16, Math.min(84, (x(hover) / W) * 100))}%`, top: tipTop }}
      >
        {hover != null && (
          <>
            <b>{pointLabel(hover)}</b>
            {/* readout lists the front-most series first */}
            {[...series].reverse().map((se) => (
              <span key={se.key} className={s.tipRow}>
                <i style={{ background: se.color }} />
                {se.label} <b>{se.values[hover] != null ? formatValue(se.values[hover]!) : "no data"}</b>
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
