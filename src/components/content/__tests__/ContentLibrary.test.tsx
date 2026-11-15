import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContentLibrary } from "@/components/content/ContentLibrary";
import { RangeProvider } from "@/components/shell/RangeProvider";
import { POSTS, TODAY } from "@/lib/data/sample";

const replace = vi.fn();
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => search,
  usePathname: () => "/content",
}));

const renderLib = () =>
  render(
    <RangeProvider>
      <ContentLibrary posts={POSTS} asOf={TODAY} />
    </RangeProvider>,
  );

const cards = () => within(screen.getByRole("list", { name: "Posts" })).getAllByRole("listitem");

describe("ContentLibrary", () => {
  beforeEach(() => {
    replace.mockClear();
    search = new URLSearchParams();
  });

  it("shows every post from the last 30 days, most viewed first", () => {
    renderLib();
    expect(cards()).toHaveLength(12);
    expect(within(cards()[0]).getByText("Studio tour in 30 seconds")).toBeInTheDocument();
  });

  it("filters by format", async () => {
    renderLib();
    await userEvent.click(screen.getByRole("button", { name: "Reels" }));
    expect(cards()).toHaveLength(2);
    expect(screen.getByText("2 posts")).toBeInTheDocument();
  });

  it("filters by platform", async () => {
    renderLib();
    await userEvent.selectOptions(screen.getByLabelText("Platform"), "youtube");
    expect(cards()).toHaveLength(4);
  });

  it("opens the post sheet and records it in the URL", async () => {
    renderLib();
    await userEvent.click(screen.getByRole("button", { name: /Studio tour in 30 seconds/ }));
    const dialog = screen.getByRole("dialog", { name: "Studio tour in 30 seconds" });
    expect(within(dialog).getByText("284,000")).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/content?post=p01", { scroll: false });
  });

  it("opens straight to a post from a shared link", () => {
    search = new URLSearchParams("post=p02");
    renderLib();
    expect(screen.getByRole("dialog", { name: "How we light product shots" })).toBeInTheDocument();
  });
});
