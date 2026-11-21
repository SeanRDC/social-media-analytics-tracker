import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlatformCards } from "@/components/platforms/PlatformCards";
import { RangeProvider } from "@/components/shell/RangeProvider";
import type { PlatformId } from "@/lib/data/types";
import { PLATFORMS } from "@/lib/data/sample";

const cardOrder = () =>
  within(screen.getByRole("list", { name: "Platforms" }))
    .getAllByRole("button", { name: /^Move / })
    .map((b) => b.getAttribute("aria-label")!.replace("Move ", ""));

function setup(order: PlatformId[] = ["youtube", "facebook", "tiktok", "linkedin", "instagram"], onSaveOrder = vi.fn(async (o: PlatformId[]) => o)) {
  const platforms = order.map((id) => PLATFORMS.find((p) => p.id === id)!);
  render(
    <RangeProvider>
      <PlatformCards platforms={platforms} onSaveOrder={onSaveOrder} />
    </RangeProvider>,
  );
  return { onSaveOrder };
}
const handle = (name: string) => screen.getByRole("button", { name: `Move ${name}` });
const key = (name: string, k: string) => fireEvent.keyDown(handle(name), { key: k });

describe("PlatformCards arranging", () => {
  it("shows the cards in the person's saved order", () => {
    setup(["tiktok", "youtube", "facebook", "linkedin", "instagram"]);
    expect(cardOrder()).toEqual(["TikTok", "YouTube", "Facebook", "LinkedIn", "Instagram"]);
  });

  it("moves a card with the keyboard and saves the new order when it's dropped", () => {
    const { onSaveOrder } = setup();
    key("Instagram", " ");
    expect(handle("Instagram")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Picked up Instagram, position 5 of 5");
    for (let i = 0; i < 4; i++) key("Instagram", "ArrowLeft");
    expect(screen.getByRole("status")).toHaveTextContent("Instagram moved to position 1 of 5");
    expect(onSaveOrder).not.toHaveBeenCalled();
    key("Instagram", "Enter");
    expect(cardOrder()).toEqual(["Instagram", "YouTube", "Facebook", "TikTok", "LinkedIn"]);
    expect(onSaveOrder).toHaveBeenCalledWith(["instagram", "youtube", "facebook", "tiktok", "linkedin"]);
  });

  it("puts a card back with Escape, saving nothing", () => {
    const { onSaveOrder } = setup();
    key("YouTube", " ");
    key("YouTube", "ArrowRight");
    key("YouTube", "ArrowRight");
    key("YouTube", "Escape");
    expect(cardOrder()[0]).toBe("YouTube");
    expect(screen.getByRole("status")).toHaveTextContent("YouTube put back at position 1");
    expect(onSaveOrder).not.toHaveBeenCalled();
  });

  it("stays put at the ends of the list", () => {
    setup();
    key("YouTube", " ");
    key("YouTube", "ArrowUp");
    expect(cardOrder()[0]).toBe("YouTube");
  });

  it("offers a reset only once the order differs from the default", () => {
    const { onSaveOrder } = setup(["linkedin", "youtube", "facebook", "tiktok", "instagram"]);
    fireEvent.click(screen.getByRole("button", { name: "Reset order" }));
    expect(cardOrder()).toEqual(["YouTube", "Facebook", "TikTok", "LinkedIn", "Instagram"]);
    expect(onSaveOrder).toHaveBeenCalledWith(["youtube", "facebook", "tiktok", "linkedin", "instagram"]);
    expect(screen.queryByRole("button", { name: "Reset order" })).not.toBeInTheDocument();
  });

  it("says when the order couldn't be saved, and can try again", async () => {
    const onSaveOrder = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([]);
    setup(undefined, onSaveOrder);
    key("TikTok", " ");
    key("TikTok", "ArrowLeft");
    await act(async () => key("TikTok", " "));
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save this order.");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Try again" })));
    expect(onSaveOrder).toHaveBeenLastCalledWith(["youtube", "tiktok", "facebook", "linkedin", "instagram"]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("explains how to arrange the cards", () => {
    setup();
    expect(handle("YouTube")).toHaveAccessibleDescription(/Drag the cards to arrange them.*Space on a card's move button/);
  });
});
