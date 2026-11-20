import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { useDismiss } from "@/hooks/useDismiss";

function Popup({ open, onDismiss, escape }: { open: boolean; onDismiss: (r: string) => void; escape?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  useDismiss(open, [panel], onDismiss, { escape });
  return (
    <>
      <div ref={panel}>inside</div>
      <div>outside</div>
    </>
  );
}

describe("useDismiss", () => {
  it("closes on a press outside, not inside", () => {
    const onDismiss = vi.fn();
    render(<Popup open onDismiss={onDismiss} />);
    fireEvent.pointerDown(screen.getByText("inside"));
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByText("outside"));
    expect(onDismiss).toHaveBeenCalledWith("outside");
  });

  it("closes on Escape unless the popup handles Escape itself", () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<Popup open onDismiss={onDismiss} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledWith("escape");
    onDismiss.mockClear();
    rerender(<Popup open onDismiss={onDismiss} escape={false} />);
    onDismiss.mockClear();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).not.toHaveBeenCalledWith("escape");
  });

  it("closes when the page goes away, and does nothing while closed", () => {
    const onDismiss = vi.fn();
    const { unmount, rerender } = render(<Popup open={false} onDismiss={onDismiss} />);
    fireEvent.pointerDown(screen.getByText("outside"));
    expect(onDismiss).not.toHaveBeenCalled();
    rerender(<Popup open onDismiss={onDismiss} />);
    unmount();
    expect(onDismiss).toHaveBeenCalledWith("hidden");
  });
});
