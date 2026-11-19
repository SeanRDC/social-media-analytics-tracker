import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExportButton } from "@/components/ui/ExportButton";

describe("ExportButton without data", () => {
  it("is not a link and says why", () => {
    render(<ExportButton format="CSV" report="Monthly performance" href="/api/export/monthly" disabled />);
    expect(screen.queryByRole("link")).toBeNull();
    const btn = screen.getByText("CSV").closest("[aria-disabled]");
    expect(btn).toHaveAttribute("aria-disabled", "true");
    expect(btn).toHaveAccessibleName("Export Monthly performance as CSV: nothing to export yet");
  });
});
