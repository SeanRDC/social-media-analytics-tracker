import { describe, expect, it } from "vitest";
import { frameText, parseCountable } from "@/lib/motion/countUp";
import { linearScale, nearestIndex, niceTicks, smoothPath } from "@/lib/chart";

describe("parseCountable", () => {
  it("splits sign, number and suffix", () => {
    expect(parseCountable("+9.8K")).toEqual({ prefix: "+", value: 9.8, decimals: 1, suffix: "K", grouped: false });
    expect(parseCountable("5.8%")).toEqual({ prefix: "", value: 5.8, decimals: 1, suffix: "%", grouped: false });
    expect(parseCountable("1,240")).toEqual({ prefix: "", value: 1240, decimals: 0, suffix: "", grouped: true });
  });

  it("returns null for text that is not a number", () => {
    expect(parseCountable("Nov 11")).toBeNull();
    expect(parseCountable("—")).toBeNull();
  });
});

describe("frameText", () => {
  it.each(["248.6K", "+9.8K", "4.9M", "5.8%", "42", "1,240", "−120"])("lands exactly on %s at t = 1", (s) => {
    const c = parseCountable(s)!;
    expect(frameText(c, 1)).toBe(s);
  });

  it("starts from zero with the same shape", () => {
    expect(frameText(parseCountable("+9.8K")!, 0)).toBe("+0.0K");
    expect(frameText(parseCountable("1,240")!, 0)).toBe("0");
  });

  it("eases out: more than half way at the midpoint", () => {
    const c = parseCountable("100")!;
    expect(Number(frameText(c, 0.5))).toBeGreaterThan(50);
  });
});

describe("chart geometry", () => {
  it("maps domain ends onto range ends", () => {
    const y = linearScale(0, 1400, 100, 0);
    expect(y(0)).toBe(100);
    expect(y(1400)).toBe(0);
    expect(y(700)).toBe(50);
  });

  it("keeps smooth curve control points inside the plot", () => {
    const pts: [number, number][] = [[0, 90], [10, 5], [20, 90], [30, 5]];
    const d = smoothPath(pts, 0, 100);
    expect(d.startsWith("M0 90")).toBe(true);
    expect(d.trim().endsWith("30 5")).toBe(true);
    const ys = [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[2]));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(100);
  });

  it("returns evenly spaced ticks that the data actually reaches", () => {
    const ticks = niceTicks(238800, 248600, 3);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    expect(ticks.every((t) => t >= 238800 && t <= 248600)).toBe(true);
    const steps = ticks.slice(1).map((t, i) => t - ticks[i]);
    expect(new Set(steps).size).toBe(1);
  });

  it("snaps a pointer position to the nearest index and clamps", () => {
    expect(nearestIndex(26, 10, 10, 5)).toBe(2);
    expect(nearestIndex(-50, 10, 10, 5)).toBe(0);
    expect(nearestIndex(999, 10, 10, 5)).toBe(4);
  });
});
