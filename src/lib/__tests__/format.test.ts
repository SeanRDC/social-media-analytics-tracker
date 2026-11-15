import { describe, expect, it } from "vitest";
import { formatCompact, formatDate, formatDuration, formatPercent, formatSigned } from "@/lib/format";

describe("formatCompact", () => {
  it.each([
    [42, "42"],
    [999, "999"],
    [1240, "1.2K"],
    [9400, "9.4K"],
    [284000, "284K"],
    [248600, "248.6K"],
    [4900000, "4.9M"],
    [13800000, "13.8M"],
  ])("formats %d as %s", (n, out) => {
    expect(formatCompact(n)).toBe(out);
  });
});

describe("formatSigned", () => {
  it("adds a plus sign to growth and keeps the minus for decline", () => {
    expect(formatSigned(2700)).toBe("+2.7K");
    expect(formatSigned(-120)).toBe("−120");
    expect(formatSigned(0)).toBe("0");
  });
});

describe("formatPercent", () => {
  it("keeps one decimal", () => {
    expect(formatPercent(5.8)).toBe("5.8%");
    expect(formatPercent(6)).toBe("6.0%");
  });
});

describe("formatDuration", () => {
  it("formats seconds as m:ss", () => {
    expect(formatDuration(372)).toBe("6:12");
    expect(formatDuration(24)).toBe("0:24");
    expect(formatDuration(null)).toBe("—");
  });
});

describe("formatDate", () => {
  it("formats an ISO date as short month and day", () => {
    expect(formatDate("2026-11-11")).toBe("Nov 11");
  });
});
