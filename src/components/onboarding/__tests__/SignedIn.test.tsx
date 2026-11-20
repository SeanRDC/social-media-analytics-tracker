import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignedIn } from "@/components/onboarding/SignedIn";

let search = new URLSearchParams("next=/platforms");
vi.mock("next/navigation", () => ({ useSearchParams: () => search }));

afterEach(() => vi.restoreAllMocks());

describe("SignedIn", () => {
  it("says the other tab carried on, so this one can be closed", async () => {
    render(<SignedIn announce={async () => true} />);
    expect(await screen.findByText("You're signed in")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue in this tab instead" })).toHaveAttribute("href", "/platforms");
  });

  it("carries on in this tab when no other tab was waiting", async () => {
    const replace = vi.fn();
    vi.stubGlobal("location", { ...window.location, replace });
    search = new URLSearchParams("next=https://evil.example");
    render(<SignedIn announce={async () => false} />);
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/overview"));
    vi.unstubAllGlobals();
  });
});
