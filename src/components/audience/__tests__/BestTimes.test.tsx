import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BestTimes } from "@/components/audience/BestTimes";
import { AUDIENCE } from "@/lib/data/sample";

describe("BestTimes", () => {
  it("calls out the single best slot", () => {
    render(<BestTimes slotLabels={AUDIENCE.slotLabels} days={AUDIENCE.bestTimes} />);
    expect(screen.getByText("Thursday at 6 p.m.")).toBeInTheDocument();
  });

  it("reads out any cell on focus", () => {
    render(<BestTimes slotLabels={AUDIENCE.slotLabels} days={AUDIENCE.bestTimes} />);
    fireEvent.focus(screen.getByRole("button", { name: /Saturday, 1 p.m./ }));
    expect(screen.getByRole("status")).toHaveTextContent("Saturday, 1 p.m. · 70% of your best slot");
  });
});
