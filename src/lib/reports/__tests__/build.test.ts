import { describe, expect, it } from "vitest";
import * as sample from "@/lib/data/sample-api";
import { buildReport, PRESETS, reportFilename, toCsv, type ReportData } from "@/lib/reports/build";

async function sampleData(): Promise<ReportData> {
  return {
    asOf: await sample.getAsOf(),
    sample: true,
    overview: await sample.getOverview(),
    daily: await sample.getDailyViews(),
    platforms: await sample.getPlatforms(),
    posts: await sample.getPosts(),
    audience: await sample.getAudience(),
  };
}

describe("buildReport", () => {
  it("builds every preset with a period and labelled sample data", async () => {
    const d = await sampleData();
    for (const p of PRESETS) {
      const r = buildReport(p.id, d);
      expect(r.title).toBe(p.title);
      expect(r.sections.length).toBeGreaterThan(0);
      expect(r.note).toMatch(/Sample data/);
      for (const s of r.sections) for (const row of s.rows) expect(row).toHaveLength(s.columns.length);
    }
  });

  it("monthly covers the last 30 days and lists only connected platforms", async () => {
    const r = buildReport("monthly", await sampleData());
    expect(r.period).toBe("Last 30 days · 17 Oct 2026 – 15 Nov 2026");
    const platforms = r.sections.find((s) => s.heading === "Platforms")!;
    expect(platforms.rows.map((row) => row[0])).not.toContain("X");
    expect(r.sections[0].rows[0]).toEqual(["Followers", 248600, "+9800"]);
  });

  it("weekly picks the single best post of the week", async () => {
    const r = buildReport("weekly", await sampleData());
    const best = r.sections.find((s) => s.heading === "Best post this week")!;
    expect(best.rows).toHaveLength(1);
    expect(best.rows[0][0]).toBe("Studio tour in 30 seconds");
    expect(r.sections.find((s) => s.heading === "Day by day")!.rows).toHaveLength(7);
  });

  it("content lists every post, most viewed first", async () => {
    const d = await sampleData();
    const rows = buildReport("content", d).sections[0].rows;
    expect(rows).toHaveLength(d.posts.length);
    expect(Number(rows[0][4])).toBeGreaterThanOrEqual(Number(rows[1][4]));
  });
});

describe("toCsv", () => {
  it("quotes commas and quotes, and starts with a BOM", async () => {
    const r = { id: "content" as const, title: "T", period: "P", sections: [{ heading: "H", columns: ["a", "b"], rows: [['Say "hi", then', 3]] }] };
    const csv = toCsv(r);
    expect(csv.startsWith("﻿T\r\nP\r\n")).toBe(true);
    expect(csv).toContain('"Say ""hi"", then",3');
  });

  it("neutralises text that a spreadsheet would run as a formula", () => {
    const csv = toCsv({ id: "content", title: "T", period: "P", sections: [{ heading: "H", columns: ["a", "b"], rows: [["=HYPERLINK(1)", "+12"]] }] });
    expect(csv).toContain("'=HYPERLINK(1),+12");
  });

  it("names the file after the report and date", () => {
    expect(reportFilename({ id: "monthly", title: "Monthly performance", period: "", sections: [] }, "2026-11-15", "csv")).toBe("monthly-performance-2026-11-15.csv");
  });
});
