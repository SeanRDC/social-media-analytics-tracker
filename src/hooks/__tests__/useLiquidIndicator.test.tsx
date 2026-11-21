import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useLiquidIndicator } from "../useLiquidIndicator";

function Tabs({ current, onPick }: { current: string; onPick: (k: string) => void }) {
  const { container, indicator, active, handlers } = useLiquidIndicator(current, onPick);
  return (
    <div ref={container} {...handlers}>
      <span ref={indicator} />
      {["a", "b"].map((k) => (
        <a key={k} href={`#${k}`} data-key={k} data-active={k === active}>
          {k}
        </a>
      ))}
    </div>
  );
}

describe("useLiquidIndicator", () => {
  it("marks the current item active", () => {
    render(<Tabs current="b" onPick={vi.fn()} />);
    expect(screen.getByText("b")).toHaveAttribute("data-active", "true");
    expect(screen.getByText("a")).toHaveAttribute("data-active", "false");
  });

  it("leaves mouse and keyboard clicks to the links", () => {
    const onPick = vi.fn();
    render(<Tabs current="a" onPick={onPick} />);
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    act(() => {
      screen.getByText("b").dispatchEvent(ev);
    });
    expect(ev.defaultPrevented).toBe(false);
    expect(onPick).not.toHaveBeenCalled();
  });
});
