export type Point = [number, number];

export function linearScale(d0: number, d1: number, r0: number, r1: number) {
  return (v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

const r = (n: number) => Math.round(n * 10) / 10;

/** Catmull-Rom curve through the points, with control points clamped to [yMin, yMax]. */
export function smoothPath(points: Point[], yMin: number, yMax: number): string {
  if (points.length === 0) return "";
  const clamp = (y: number) => Math.min(yMax, Math.max(yMin, y));
  let d = `M${r(points[0][0])} ${r(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = clamp(p1[1] + (p2[1] - p0[1]) / 6);
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = clamp(p2[1] - (p3[1] - p1[1]) / 6);
    d += ` C${r(c1x)} ${r(c1y)} ${r(c2x)} ${r(c2y)} ${r(p2[0])} ${r(p2[1])}`;
  }
  return d;
}

export function linePath(points: Point[]): string {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${r(x)} ${r(y)}`).join(" ");
}

/** Closes a line path down to a baseline so it can be filled. */
export function areaPath(line: string, x0: number, x1: number, baseY: number): string {
  return `${line} L${r(x1)} ${r(baseY)} L${r(x0)} ${r(baseY)}Z`;
}

/** Round, evenly spaced tick values that lie inside [min, max]. */
export function niceTicks(min: number, max: number, count: number): number[] {
  const span = max - min;
  if (span <= 0) return [min];
  const raw = span / count;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

/** Index of the sample nearest to `x`, for samples at x0, x0 + step, … (n samples). */
export function nearestIndex(x: number, x0: number, step: number, n: number): number {
  return Math.max(0, Math.min(n - 1, Math.round((x - x0) / step)));
}
