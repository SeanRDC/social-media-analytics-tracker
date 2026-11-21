import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TabBar } from "../TabBar";

let pathname = "/overview";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push: vi.fn() }) }));

describe("TabBar", () => {
  it("offers the same five sections as the desktop navbar", () => {
    render(<TabBar />);
    const tabs = within(screen.getByRole("navigation", { name: "Tabs" })).getAllByRole("link");
    expect(tabs.map((t) => t.textContent)).toEqual(["Overview", "Platforms", "Content", "Audience", "Reports"]);
  });

  it("marks Audience as current on the audience page", () => {
    pathname = "/audience";
    render(<TabBar />);
    expect(screen.getByRole("link", { name: "Audience" })).toHaveAttribute("aria-current", "page");
  });
});
