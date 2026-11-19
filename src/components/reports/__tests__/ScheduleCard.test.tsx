import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ScheduleCard } from "@/components/reports/ScheduleCard";

const OFF = { enabled: false, dayOfWeek: 1, hour: 9, timezone: "UTC" };

describe("ScheduleCard", () => {
  it("saves when turned on, with this device's time zone", async () => {
    const onSave = vi.fn(async () => {});
    render(<ScheduleCard email="a@example.com" initial={OFF} onSave={onSave} />);
    expect(screen.getByRole("status")).toHaveTextContent("Weekly email is off");
    await userEvent.click(screen.getByRole("switch", { name: "Send weekly email report" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ enabled: true, dayOfWeek: 1, hour: 9, timezone: expect.any(String) }));
    expect(await screen.findByText(/Next report: Monday at 9:00 a\.m\./)).toBeInTheDocument();
  });

  it("saves the chosen day", async () => {
    const onSave = vi.fn(async () => {});
    render(<ScheduleCard email="a@example.com" initial={{ ...OFF, enabled: true }} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Send on: Monday" }));
    await userEvent.click(screen.getByRole("option", { name: "Friday" }));
    expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ dayOfWeek: 5 }));
  });

  it("goes back and says so when saving fails", async () => {
    render(<ScheduleCard email="a@example.com" initial={OFF} onSave={vi.fn(async () => Promise.reject(new Error("x")))} />);
    await userEvent.click(screen.getByRole("switch", { name: "Send weekly email report" }));
    expect(await screen.findByText("Couldn't save. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Send weekly email report" })).toHaveAttribute("aria-checked", "false");
  });
});
