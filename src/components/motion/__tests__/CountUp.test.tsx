import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CountUp } from "@/components/motion/CountUp";

describe("CountUp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener() {}, removeEventListener() {} });
  });
  afterEach(() => vi.useRealTimers());

  it("starts from zero and always lands on the exact value, even if frames never run", () => {
    // requestAnimationFrame never fires under fake timers unless advanced; the safety timer must finish the job.
    window.requestAnimationFrame = vi.fn(() => 1);
    render(<CountUp value="+9.8K" delay={100} duration={500} />);
    expect(screen.getByText("+0.0K")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(900));
    expect(screen.getByText("+9.8K")).toBeInTheDocument();
  });

  it("shows the final value immediately when reduced motion is on", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} });
    render(<CountUp value="248.6K" />);
    expect(screen.getByText("248.6K")).toBeInTheDocument();
  });

  it("renders plain text untouched", () => {
    render(<CountUp value="Nov 11" />);
    expect(screen.getByText("Nov 11")).toBeInTheDocument();
  });
});
