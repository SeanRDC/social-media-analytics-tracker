import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TopPostsTable } from "@/components/overview/TopPostsTable";
import type { Post } from "@/lib/data/types";

const base = { kind: "video", avgWatchSeconds: 30, likes: 0, comments: 0, shares: 0, thumb: "a" } as const;
const POSTS: Post[] = [
  { ...base, id: "1", title: "Alpha", platform: "tiktok", publishedAt: "2026-11-11", views: 284000, engagement: 9.4 },
  { ...base, id: "2", title: "Bravo", platform: "youtube", publishedAt: "2026-11-08", views: 96300, engagement: 6.1 },
  { ...base, id: "3", title: "Charlie", platform: "instagram", publishedAt: "2026-11-13", views: 71800, engagement: 7.2 },
];

const titles = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((r) => within(r).getByRole("heading").textContent);

describe("TopPostsTable", () => {
  it("starts sorted by views", () => {
    render(<TopPostsTable posts={POSTS} />);
    expect(titles()).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("re-sorts when another order is chosen and updates the button label", async () => {
    render(<TopPostsTable posts={POSTS} />);
    await userEvent.click(screen.getByRole("button", { name: /most viewed/i }));
    await userEvent.click(screen.getByRole("menuitemradio", { name: "Most engaging" }));
    expect(titles()).toEqual(["Alpha", "Charlie", "Bravo"]);
    expect(screen.getByRole("button", { name: /most engaging/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /most engaging/i }));
    await userEvent.click(screen.getByRole("menuitemradio", { name: "Newest" }));
    expect(titles()).toEqual(["Charlie", "Alpha", "Bravo"]);
  });

  it("closes the menu with Escape", async () => {
    render(<TopPostsTable posts={POSTS} />);
    await userEvent.click(screen.getByRole("button", { name: /most viewed/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
