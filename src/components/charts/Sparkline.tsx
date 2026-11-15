"use client";

import { useElementWidth } from "@/hooks/useElementWidth";
import { linearScale, smoothPath } from "@/lib/chart";

interface Props {
  values: number[];
  color: string;
  height?: number;
  label: string;
}

/** Small trend line that draws itself in. Rendered at its real pixel width so nothing stretches. */
export function Sparkline({ values, color, height = 40, label }: Props) {
  const { ref, width } = useElementWidth<HTMLDivElement>(200);
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (i: number) => 3 + (i * (width - 8)) / (values.length - 1);
  const y = linearScale(min, max === min ? min + 1 : max, height - 4, 4);
  const d = smoothPath(
    values.map((v, i) => [x(i), y(v)]),
    1,
    height - 1,
  );
  const last = values.length - 1;
  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={label} style={{ display: "block", overflow: "visible", maxWidth: "100%" }}>
        <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={{ strokeDasharray: 1, animation: "draw 1.4s var(--out) .3s both" }} />
        <circle cx={x(last)} cy={y(values[last])} r={3} fill={color} />
      </svg>
    </div>
  );
}
