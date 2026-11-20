import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorCard } from "@/components/errors/ErrorCard";

afterEach(() => vi.restoreAllMocks());

describe("ErrorCard", () => {
  it("offers a retry and a way out, with the server's reference", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    const error = Object.assign(new Error("An error occurred in the Server Components render."), { digest: "4021339897" });
    render(<ErrorCard error={error} retry={retry} home={{ href: "/overview", label: "Go to your dashboard" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Go to your dashboard" })).toHaveAttribute("href", "/overview");
    expect(screen.getByText("Reference: 4021339897")).toBeInTheDocument();
  });

  it("leaves the reference out for errors without one", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorCard error="broken" retry={vi.fn()} home={{ href: "/", label: "Home" }} />);
    expect(screen.queryByText(/Reference/)).not.toBeInTheDocument();
  });
});
