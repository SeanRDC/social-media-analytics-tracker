import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TopNav } from "../TopNav";

let pathname = "/platforms/youtube";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/app/actions/notifications", () => ({ getNotifications: vi.fn(), readNotification: vi.fn(), readAllNotifications: vi.fn() }));

describe("TopNav", () => {
  it("marks the section of the current page as current", () => {
    pathname = "/platforms/youtube";
    render(<TopNav accountName="Northbay Studio" />);
    const main = screen.getByRole("navigation", { name: "Main" });
    expect(within(main).getByRole("link", { name: "Platforms" })).toHaveAttribute("aria-current", "page");
    expect(within(main).getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });

  it("names the brand link after the app", () => {
    render(<TopNav accountName="Northbay Studio" />);
    expect(screen.getByRole("link", { name: "Ispector home" })).toHaveAttribute("href", "/overview");
  });

  it("shows the account name on the account button, which opens settings", () => {
    render(<TopNav accountName="Northbay Studio" />);
    const account = screen.getByRole("link", { name: /Northbay Studio/ });
    expect(account).toHaveAttribute("href", "/settings");
  });

  it("names the account button even where the visible name is hidden", () => {
    render(<TopNav accountName="Northbay Studio" />);
    // the name text is hidden by CSS on tablets and phones, so the link needs its own label
    expect(screen.getByRole("link", { name: "Account: Northbay Studio" })).toHaveAttribute("aria-label", "Account: Northbay Studio");
  });

  it("offers a notifications button and a settings shortcut", () => {
    pathname = "/settings";
    render(<TopNav accountName="Northbay Studio" unread={3} />);
    expect(screen.getByRole("button", { name: "Notifications, 3 unread" })).toHaveAttribute("aria-haspopup", "dialog");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("aria-current", "page");
  });
});
