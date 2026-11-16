import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Connections } from "@/components/settings/Connections";
import type { ConnectionView } from "@/lib/data/types";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }) }));

const LIST: ConnectionView[] = [
  { id: "youtube", name: "YouTube", account: "Northbay Studio", status: "connected", mode: "live" },
  { id: "tiktok", name: "TikTok", account: "@northbay", status: "expired", mode: "live" },
  { id: "linkedin", name: "LinkedIn", account: "", status: "not-connected", mode: "live" },
  { id: "x", name: "X", account: "", status: "not-connected", mode: "unavailable" },
];

const setup = (onDisconnect = vi.fn(async () => {})) => {
  render(<Connections initial={LIST} result={null} onDisconnect={onDisconnect} />);
  return onDisconnect;
};

describe("Connections", () => {
  it("asks before disconnecting and can be cancelled", async () => {
    const onDisconnect = setup();
    const row = screen.getByRole("listitem", { name: "YouTube" });
    await userEvent.click(within(row).getByRole("button", { name: "Disconnect" }));
    expect(within(row).getByText("Disconnect YouTube?")).toBeInTheDocument();
    await userEvent.click(within(row).getByRole("button", { name: "Keep" }));
    expect(within(row).getByText("Connected")).toBeInTheDocument();
    expect(onDisconnect).not.toHaveBeenCalled();
  });

  it("disconnects through the server after confirming and offers to connect again", async () => {
    const onDisconnect = setup();
    const row = screen.getByRole("listitem", { name: "YouTube" });
    await userEvent.click(within(row).getByRole("button", { name: "Disconnect" }));
    await userEvent.click(within(row).getByRole("button", { name: "Yes, disconnect" }));
    expect(onDisconnect).toHaveBeenCalledWith("youtube");
    expect(await within(row).findByText("Not connected")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Connect" })).toHaveAttribute("href", "/api/connect/youtube/start?returnTo=%2Fsettings");
  });

  it("restores the row and explains when disconnecting fails", async () => {
    setup(vi.fn(async () => Promise.reject(new Error("offline"))));
    const row = screen.getByRole("listitem", { name: "YouTube" });
    await userEvent.click(within(row).getByRole("button", { name: "Disconnect" }));
    await userEvent.click(within(row).getByRole("button", { name: "Yes, disconnect" }));
    expect(await within(row).findByRole("alert")).toHaveTextContent("Couldn't disconnect YouTube");
    expect(within(row).getByText("Connected")).toBeInTheDocument();
  });

  it("asks to reconnect when access expired", () => {
    setup();
    const row = screen.getByRole("listitem", { name: "TikTok" });
    expect(within(row).getByText("Access expired")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Reconnect" })).toHaveAttribute("href", "/api/connect/tiktok/start?returnTo=%2Fsettings");
  });

  it("links unconnected platforms to the connect flow and marks unavailable ones", () => {
    setup();
    expect(within(screen.getByRole("listitem", { name: "LinkedIn" })).getByRole("link", { name: "Connect" })).toBeInTheDocument();
    const x = screen.getByRole("listitem", { name: "X" });
    expect(within(x).getByText("Coming later")).toBeInTheDocument();
    expect(within(x).queryByRole("link")).toBeNull();
  });

  it("shows the result of a connection attempt", () => {
    render(<Connections initial={LIST} result={{ platform: "linkedin", ok: false, reason: "no-account" }} onDisconnect={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't find a LinkedIn Page");
  });

  it("imports a platform's history right after it connects", async () => {
    const onImport = vi.fn(async () => "imported" as const);
    render(<Connections initial={LIST} result={{ platform: "youtube", ok: true }} onDisconnect={vi.fn()} onImport={onImport} />);
    expect(screen.getByRole("status")).toHaveTextContent("YouTube is connected. Importing its history…");
    expect(await screen.findByText(/Its history is imported/)).toBeInTheDocument();
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledWith("youtube");
    expect(refresh).toHaveBeenCalled();
  });

  it("shows when numbers last arrived and why the last update failed", () => {
    const list: ConnectionView[] = [{ ...LIST[0], updatedAt: "2026-11-15T04:00:00Z", syncError: "YouTube /channels failed (500)." }];
    render(<Connections initial={list} result={null} onDisconnect={vi.fn()} />);
    const row = screen.getByRole("listitem", { name: "YouTube" });
    expect(within(row).getByText(/Updated 15 Nov/)).toBeInTheDocument();
    expect(within(row).getByText(/Last update didn't finish: YouTube \/channels failed \(500\)\./)).toBeInTheDocument();
  });

  it("does not import after a failed connection", () => {
    const onImport = vi.fn();
    render(<Connections initial={LIST} result={{ platform: "youtube", ok: false, reason: "denied" }} onDisconnect={vi.fn()} onImport={onImport} />);
    expect(onImport).not.toHaveBeenCalled();
  });
});
