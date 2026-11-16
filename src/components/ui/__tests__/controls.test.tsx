import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExportButton } from "@/components/ui/ExportButton";
import { Switch } from "@/components/ui/Switch";

function SwitchHarness() {
  const [on, setOn] = useState(true);
  return <Switch label="Weekly email" checked={on} onChange={setOn} />;
}

describe("Switch", () => {
  it("toggles its checked state", () => {
    render(<SwitchHarness />);
    const sw = screen.getByRole("switch", { name: "Weekly email" });
    expect(sw).toHaveAttribute("aria-checked", "true");
    fireEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "false");
  });
});

describe("ExportButton", () => {
  afterEach(() => vi.useRealTimers());

  it("moves from idle to preparing to done, then resets", () => {
    vi.useFakeTimers();
    render(<ExportButton format="PDF" report="Monthly performance" href="/reports/print/monthly" />);
    const btn = screen.getByRole("link", { name: "Export Monthly performance as PDF" });
    expect(btn).toHaveAttribute("href", "/reports/print/monthly");
    expect(btn).toHaveAttribute("target", "_blank");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn).toHaveAttribute("aria-disabled", "true");
    act(() => vi.advanceTimersByTime(1300));
    expect(btn).toHaveTextContent("Ready");
    expect(screen.getByRole("status")).toHaveTextContent("Monthly performance PDF is ready");
    act(() => vi.advanceTimersByTime(2600));
    expect(btn).toHaveTextContent("PDF");
    expect(btn).toHaveAttribute("aria-disabled", "false");
  });
});

describe("ExportButton (CSV)", () => {
  it("downloads in place", () => {
    render(<ExportButton format="CSV" report="Weekly snapshot" href="/api/export/weekly" />);
    const link = screen.getByRole("link", { name: "Export Weekly snapshot as CSV" });
    expect(link).toHaveAttribute("download");
    expect(link).toHaveAttribute("href", "/api/export/weekly");
  });
});
