import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NoData } from "@/components/ui/NoData";

describe("NoData", () => {
  it("asks the person to connect a platform instead of showing numbers", () => {
    render(<NoData />);
    expect(screen.getByRole("heading", { name: "Connect a platform to see your numbers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Connect platforms/ })).toHaveAttribute("href", "/onboarding/connect");
  });
});
