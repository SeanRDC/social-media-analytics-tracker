import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PullToRefresh } from "../PullToRefresh";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe("PullToRefresh", () => {
  it("renders the page column as the main landmark with its content", () => {
    render(
      <PullToRefresh className="col">
        <h1>Overview</h1>
      </PullToRefresh>,
    );
    const main = screen.getByRole("main");
    expect(main).toHaveClass("col");
    expect(main).toHaveAttribute("data-pull-refresh");
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });

  it("keeps the logo loader out of the accessibility tree", () => {
    const { container } = render(<PullToRefresh>page</PullToRefresh>);
    expect(container.querySelector("svg")?.closest("[aria-hidden='true']")).not.toBeNull();
  });
});
