import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Connections } from "@/components/settings/Connections";

const LIST = [
  { id: "youtube", name: "YouTube", account: "Northbay Studio", status: "connected" },
  { id: "x", name: "X", account: "", status: "not-connected" },
] as const;

describe("Connections", () => {
  it("asks before disconnecting and can be cancelled", async () => {
    render(<Connections initial={[...LIST]} />);
    const row = screen.getByRole("listitem", { name: "YouTube" });
    await userEvent.click(within(row).getByRole("button", { name: "Disconnect" }));
    expect(within(row).getByText("Disconnect YouTube?")).toBeInTheDocument();
    await userEvent.click(within(row).getByRole("button", { name: "Keep" }));
    expect(within(row).getByText("Connected")).toBeInTheDocument();
  });

  it("disconnects after confirming and offers to reconnect", async () => {
    render(<Connections initial={[...LIST]} />);
    const row = screen.getByRole("listitem", { name: "YouTube" });
    await userEvent.click(within(row).getByRole("button", { name: "Disconnect" }));
    await userEvent.click(within(row).getByRole("button", { name: "Yes, disconnect" }));
    expect(within(row).getByText("Not connected")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Connect" })).toHaveAttribute("href", "/onboarding/connect");
  });

  it("links unconnected platforms to the connect flow", () => {
    render(<Connections initial={[...LIST]} />);
    const row = screen.getByRole("listitem", { name: "X" });
    expect(within(row).getByRole("link", { name: "Connect" })).toBeInTheDocument();
  });
});
