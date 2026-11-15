import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CompareRanking } from "@/components/platforms/CompareRanking";
import { RangeProvider } from "@/components/shell/RangeProvider";
import { PLATFORMS } from "@/lib/data/sample";

const names = () => within(screen.getByRole("list", { name: /ranking/i })).getAllByRole("listitem").map((li) => li.dataset.platform);

describe("CompareRanking", () => {
  it("ranks connected platforms by engagement by default", () => {
    render(
      <RangeProvider>
        <CompareRanking platforms={PLATFORMS} />
      </RangeProvider>,
    );
    expect(names()).toEqual(["tiktok", "instagram", "youtube", "linkedin", "facebook"]);
    expect(screen.getByText("8.9%")).toBeInTheDocument();
  });

  it("re-ranks by follower growth for the selected range", async () => {
    render(
      <RangeProvider>
        <CompareRanking platforms={PLATFORMS} />
      </RangeProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Growth" }));
    expect(names()).toEqual(["youtube", "tiktok", "instagram", "facebook", "linkedin"]);
    expect(screen.getByText("+4.1K")).toBeInTheDocument();
  });
});
