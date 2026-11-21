import { describe, expect, it } from "vitest";
import { displacementAt, mapSize, type LensShape } from "../liquidGlass";

// a 300×60 capsule with 20px of surroundings and an 18px rim
const s: LensShape = { width: 300, height: 60, radius: 30, margin: 20, bezel: 18 };
const at = (x: number, y: number) => displacementAt(x + s.margin, y + s.margin, s);

describe("liquid glass displacement", () => {
  it("leaves the flat middle of the bar undistorted", () => {
    expect(at(150, 30)).toEqual([0, 0]);
  });

  it("bends outwards near the edges, strongest at the rim", () => {
    const [, nearTop] = at(150, 6);
    const [, atTop] = at(150, 0.5);
    expect(nearTop).toBeLessThan(0);
    expect(atTop).toBeLessThan(nearTop);
    const [right] = at(299, 30);
    expect(right).toBeGreaterThan(0.5);
  });

  it("points away from the centre around the rounded ends", () => {
    const [dx, dy] = at(4, 8);
    expect(dx).toBeLessThan(0);
    expect(dy).toBeLessThan(0);
  });

  it("stays within unit length", () => {
    for (const [x, y] of [[-10, -10], [0, 0], [310, 70], [150, -5]]) {
      const [dx, dy] = at(x, y);
      expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it("sizes the map to the bar plus its surroundings", () => {
    expect(mapSize(s)).toEqual({ width: 340, height: 100 });
  });
});
