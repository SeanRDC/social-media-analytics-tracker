import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AlertSettings } from "@/components/settings/AlertSettings";

const INITIAL = { spike: true, milestone: true, drop: false, reconnect: true };

describe("AlertSettings", () => {
  it("stores each switch", async () => {
    const onChange = vi.fn(async () => {});
    render(<AlertSettings initial={INITIAL} onChange={onChange} />);
    await userEvent.click(screen.getByRole("switch", { name: "Engagement drops" }));
    expect(onChange).toHaveBeenCalledWith("drop", true);
    expect(screen.getByRole("switch", { name: "Engagement drops" })).toHaveAttribute("aria-checked", "true");
  });

  it("flips back when saving fails", async () => {
    render(<AlertSettings initial={INITIAL} onChange={vi.fn(async () => Promise.reject(new Error("x")))} />);
    await userEvent.click(screen.getByRole("switch", { name: "Follower milestones" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save");
    expect(screen.getByRole("switch", { name: "Follower milestones" })).toHaveAttribute("aria-checked", "true");
  });
});
