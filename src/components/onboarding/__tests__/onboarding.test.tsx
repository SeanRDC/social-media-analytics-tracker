import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectFlow } from "@/components/onboarding/ConnectFlow";
import type { ConnectionView } from "@/lib/data/types";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const view = (over: Partial<ConnectionView> & Pick<ConnectionView, "id" | "name">): ConnectionView => ({ account: "", status: "not-connected", mode: "live", ...over });
const PLATFORMS = [view({ id: "youtube", name: "YouTube" }), view({ id: "instagram", name: "Instagram" }), view({ id: "linkedin", name: "LinkedIn", mode: "unavailable" })];

describe("ConnectFlow", () => {
  beforeEach(() => push.mockClear());

  it("links each platform to its connect route and shows it is waiting", () => {
    render(<ConnectFlow platforms={PLATFORMS} result={null} />);
    const yt = screen.getByRole("listitem", { name: "YouTube" });
    const link = within(yt).getByRole("link", { name: "Connect YouTube" });
    expect(link).toHaveAttribute("href", "/api/connect/youtube/start?returnTo=%2Fonboarding%2Fconnect");
    fireEvent.click(link);
    expect(within(yt).getByText("Waiting for YouTube…")).toBeInTheDocument();
  });

  it("keeps Continue disabled until a platform is connected", () => {
    render(<ConnectFlow platforms={PLATFORMS} result={null} />);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getByText("0 of 2 connected")).toBeInTheDocument();
  });

  it("shows connected platforms and continues to the import", () => {
    const list = [view({ id: "youtube", name: "YouTube", status: "connected", account: "Northbay Studio" }), PLATFORMS[1], PLATFORMS[2]];
    render(<ConnectFlow platforms={list} result={{ platform: "youtube", ok: true }} />);
    const yt = screen.getByRole("listitem", { name: "YouTube" });
    expect(within(yt).getByText("Connected")).toBeInTheDocument();
    expect(within(yt).getByText("Northbay Studio")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 connected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(push).toHaveBeenCalledWith("/onboarding/sync?p=youtube");
  });

  it("explains Instagram's Professional account requirement and offers a retry", () => {
    render(<ConnectFlow platforms={PLATFORMS} result={{ platform: "instagram", ok: false, reason: "needs-professional" }} />);
    const ig = screen.getByRole("listitem", { name: "Instagram" });
    expect(within(ig).getByText(/Professional accounts/)).toBeInTheDocument();
    fireEvent.click(within(ig).getByRole("button", { name: "How to switch" }));
    expect(within(ig).getByText(/Switch to professional account/)).toBeInTheDocument();
    expect(within(ig).getByRole("link", { name: "I've switched, try again" })).toHaveAttribute("href", expect.stringContaining("/api/connect/instagram/start"));
  });

  it("shows why a connection failed on that platform's row", () => {
    render(<ConnectFlow platforms={PLATFORMS} result={{ platform: "youtube", ok: false, reason: "denied" }} />);
    const yt = screen.getByRole("listitem", { name: "YouTube" });
    expect(within(yt).getByRole("alert")).toHaveTextContent("You cancelled on YouTube");
    expect(within(yt).getByRole("link", { name: "Connect YouTube" })).toBeInTheDocument();
  });

  it("asks to reconnect expired platforms", () => {
    const list = [view({ id: "youtube", name: "YouTube", status: "expired", account: "Northbay" }), PLATFORMS[1]];
    render(<ConnectFlow platforms={list} result={null} />);
    const yt = screen.getByRole("listitem", { name: "YouTube" });
    expect(within(yt).getByRole("link", { name: "Reconnect YouTube" })).toBeInTheDocument();
  });

  it("marks unavailable platforms as coming later and simulated ones as simulated", () => {
    const list = [view({ id: "youtube", name: "YouTube", mode: "simulated" }), PLATFORMS[2]];
    render(<ConnectFlow platforms={list} result={null} />);
    expect(within(screen.getByRole("listitem", { name: "LinkedIn" })).getByText("Coming later")).toBeInTheDocument();
    expect(within(screen.getByRole("listitem", { name: "LinkedIn" })).queryByRole("link")).toBeNull();
    expect(within(screen.getByRole("listitem", { name: "YouTube" })).getByText(/Simulated/)).toBeInTheDocument();
  });
});
