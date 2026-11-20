import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BestTimes, zoneLabel } from "@/components/audience/BestTimes";
import { AUDIENCE } from "@/lib/data/sample";

describe("BestTimes", () => {
  it("calls out the single best slot", () => {
    render(<BestTimes slotLabels={AUDIENCE.slotLabels} days={AUDIENCE.bestTimes} timeZone="UTC" />);
    expect(screen.getByText("Thursday at 6 p.m.")).toBeInTheDocument();
  });

  it("reads out any cell on focus", () => {
    render(<BestTimes slotLabels={AUDIENCE.slotLabels} days={AUDIENCE.bestTimes} timeZone="UTC" />);
    fireEvent.focus(screen.getByRole("button", { name: /Saturday, 1 p.m./ }));
    expect(screen.getByRole("status")).toHaveTextContent("Saturday, 1 p.m. · 70% of your best slot");
  });

  it("says which time zone the times are in", () => {
    render(<BestTimes slotLabels={AUDIENCE.slotLabels} days={AUDIENCE.bestTimes} timeZone="Asia/Manila" />);
    expect(screen.getByText("Times in Manila time (GMT+8)")).toBeInTheDocument();
  });
});

describe("zoneLabel", () => {
  it("names the city and its offset, and leaves UTC as it is", () => {
    expect(zoneLabel("UTC")).toBe("UTC");
    expect(zoneLabel("America/New_York", new Date("2026-01-15T12:00:00Z"))).toBe("New York time (GMT-5)");
  });
});
