import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SegmentedControl } from "@/components/shell/SegmentedControl";

const OPTIONS = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
] as const;

function Harness({ onChange }: { onChange: (v: number) => void }) {
  const [v, setV] = useState<number>(30);
  return (
    <SegmentedControl
      label="Date range"
      options={OPTIONS}
      value={v}
      onChange={(next) => {
        setV(next);
        onChange(next);
      }}
    />
  );
}

describe("SegmentedControl", () => {
  it("marks the current option as pressed", () => {
    render(<Harness onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "30D" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "7D" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange and moves the pressed state when another option is chosen", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "7D" }));
    expect(onChange).toHaveBeenCalledWith(7);
    expect(screen.getByRole("button", { name: "7D" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "30D" })).toHaveAttribute("aria-pressed", "false");
  });

  it("is labelled as a group", () => {
    render(<Harness onChange={() => {}} />);
    expect(screen.getByRole("group", { name: "Date range" })).toBeInTheDocument();
  });
});
