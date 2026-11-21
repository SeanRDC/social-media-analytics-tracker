import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BestTimes, zoneLabel } from "@/components/audience/BestTimes";
import type { PostingCell, PostingTimes } from "@/lib/data/types";
import { AUDIENCE } from "@/lib/data/sample";

const props = { ...AUDIENCE, timeZone: "UTC" };

/** A posting grid with every cell empty except the ones given as [day, slot, cell]. */
function grid(cells: [number, number, PostingCell][], extra: Partial<PostingTimes> = {}): PostingTimes {
  const empty = (): PostingCell => ({ score: null, posts: 0 });
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({ day, cells: [empty(), empty(), empty(), empty()] }));
  for (const [d, t, c] of cells) days[d].cells[t] = c;
  return { days, byDay: days.map(empty), bySlot: [empty(), empty(), empty(), empty()], used: 0, waiting: 0, untracked: 0, ...extra };
}

describe("BestTimes", () => {
  it("calls out the best day and time, with its window's hours", () => {
    render(<BestTimes {...props} />);
    expect(screen.getByText("Thursday evening")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Thursday evening (4–8 p.m.) · 1.5× your usual first-week views · 8 posts");
  });

  it("reads out any cell on focus, and says when a time needs more posts", () => {
    render(<BestTimes {...props} />);
    fireEvent.focus(screen.getByRole("button", { name: /^Saturday midday/ }));
    expect(screen.getByRole("status")).toHaveTextContent("Saturday midday (11 a.m.–4 p.m.) · 1.2× your usual first-week views · 6 posts");
    fireEvent.focus(screen.getByRole("button", { name: /^Sunday night/ }));
    expect(screen.getByRole("status")).toHaveTextContent("Sunday night (8 p.m.–5 a.m.) · 1 post so far, needs 3");
  });

  it("falls back to the best day and window while no single time has enough posts", () => {
    const thin = grid([[0, 2, { score: null, posts: 1 }]], {
      bySlot: [{ score: null, posts: 0 }, { score: null, posts: 1 }, { score: 1.3, posts: 3 }, { score: null, posts: 0 }],
      byDay: [{ score: 1.1, posts: 3 }, ...Array.from({ length: 6 }, () => ({ score: null, posts: 0 }))],
      used: 4,
    });
    render(<BestTimes {...props} posting={{ all: thin, platforms: [] }} online={null} />);
    expect(screen.getByText("Best so far: evenings, Mondays")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("No single day and time has 3 posts yet. So far evenings (4–8 p.m.) and Mondays do best.");
  });

  it("explains which posts were left out and why", () => {
    const g = grid([], { used: 12, waiting: 2, untracked: 40 });
    render(<BestTimes {...props} posting={{ all: g, platforms: [] }} online={null} />);
    expect(screen.getByText(/Based on 12 posts; 2 newer posts count once a week old; 40 older posts are left out: imported after their first week/)).toBeInTheDocument();
  });

  it("switches to when Instagram followers are online", () => {
    render(<BestTimes {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Followers online" }));
    expect(screen.getByRole("status")).toHaveTextContent("Thursday evening (4–8 p.m.) · about 7,400 followers online an hour");
    expect(screen.getByText(/From Instagram's own hourly count of followers online, over the last 30 days/)).toBeInTheDocument();
  });

  it("only offers the followers view where a platform reports it", () => {
    render(<BestTimes {...props} online={null} />);
    expect(screen.queryByRole("button", { name: "Followers online" })).not.toBeInTheDocument();
  });

  it("filters by platform", () => {
    const yt = grid([[1, 0, { score: 2, posts: 4 }]], { used: 4 });
    const tt = grid([[4, 3, { score: 1.7, posts: 5 }]], { used: 5 });
    render(<BestTimes {...props} online={null} posting={{ all: yt, platforms: [{ id: "youtube", times: yt }, { id: "tiktok", times: tt }] }} />);
    expect(screen.getByText("Tuesday morning")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "TikTok" }));
    expect(screen.getByText("Friday night")).toBeInTheDocument();
  });

  it("says which time zone the times are in", () => {
    render(<BestTimes {...props} timeZone="Asia/Manila" />);
    expect(screen.getByText(/Times in Manila time \(GMT\+8\)/)).toBeInTheDocument();
  });
});

describe("zoneLabel", () => {
  it("names the city and its offset, and leaves UTC as it is", () => {
    expect(zoneLabel("UTC")).toBe("UTC");
    expect(zoneLabel("America/New_York", new Date("2026-01-15T12:00:00Z"))).toBe("New York time (GMT-5)");
  });
});
