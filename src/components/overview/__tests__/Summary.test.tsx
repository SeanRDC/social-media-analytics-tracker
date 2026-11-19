import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { KpiTiles, SummaryStatement, growthPercent } from "@/components/overview/Summary";
import { RANGE_OPTIONS, RangeProvider } from "@/components/shell/RangeProvider";
import { SegmentedControl } from "@/components/shell/SegmentedControl";
import { useRange } from "@/components/shell/RangeProvider";
import type { Metrics, Range } from "@/lib/data/types";

const m = (followers: number, followerDelta: number, views: number, viewsChange: number): Metrics => ({
  followers,
  followerDelta,
  views,
  viewsChange,
  engagement: 5.8,
  engagementChange: 0.4,
  posts: 42,
  dataSince: null,
  comparable: true,
});
const METRICS: Record<Range, Metrics> = {
  7: m(248600, 2000, 1_100_000, -3.2),
  30: m(248600, 9800, 4_900_000, 12.5),
  90: m(248600, 24000, 13_000_000, 8),
};

function RangeSwitch() {
  const { range, setRange } = useRange();
  return <SegmentedControl label="Date range" options={RANGE_OPTIONS} value={range} onChange={setRange} />;
}

describe("growthPercent", () => {
  it("is the period's gain as a share of where it started", () => {
    expect(growthPercent(m(110, 10, 0, 0))).toBeCloseTo(10);
    // nothing to compare against: unknown, not 0%
    expect(growthPercent(m(0, 0, 0, 0))).toBeNull();
  });
});

describe("KpiTiles", () => {
  it("shows one tile per headline metric for the selected range", () => {
    render(
      <RangeProvider>
        <KpiTiles metrics={METRICS} />
      </RangeProvider>,
    );
    const tiles = within(screen.getByRole("list", { name: "Key numbers" })).getAllByRole("listitem");
    expect(tiles.map((t) => t.getAttribute("aria-label"))).toEqual(["Followers: 248.6K", "Views: 4.9M", "Engagement: 5.8%", "Posts: 42"]);
  });

  it("says whether views rose or fell against the previous period", async () => {
    render(
      <RangeProvider>
        <RangeSwitch />
        <KpiTiles metrics={METRICS} />
      </RangeProvider>,
    );
    expect(screen.getByText("+12.5% vs last period")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "7D" }));
    expect(screen.getByText("−3.2% vs last period")).toBeInTheDocument();
  });
});

describe("SummaryStatement", () => {
  it("states the growth for the range and links to the report", async () => {
    render(
      <RangeProvider>
        <SummaryStatement accountName="Northbay Studio" connectedCount={5} metrics={METRICS} />
      </RangeProvider>,
    );
    // the figure counts up, then settles on the real value
    await waitFor(() => expect(screen.getByRole("heading", { name: /Your audience grew/ })).toHaveTextContent("4.1%"), { timeout: 2500 });
    expect(screen.getByText(/Northbay Studio · 5 platforms/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View report/ })).toHaveAttribute("href", "/reports");
  });
});
