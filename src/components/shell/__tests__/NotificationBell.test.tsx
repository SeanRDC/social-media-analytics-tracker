import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Notification } from "@/lib/notifications";
import { NotificationBell, placePanel, timeAgo } from "../NotificationBell";

const push = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/overview", useRouter: () => ({ push }) }));

const NOW = new Date("2026-11-20T12:00:00Z").getTime();
const item = (over: Partial<Notification>): Notification => ({
  id: "n1",
  kind: "spike",
  title: "A post is taking off",
  body: "“Studio tour” on TikTok has 284K views, 2.3× your usual.",
  url: "/content?post=p01",
  createdAt: new Date(NOW - 3 * 3600_000).toISOString(),
  read: false,
  ...over,
});

describe("timeAgo", () => {
  it("reads naturally", () => {
    expect(timeAgo(new Date(NOW - 20_000).toISOString(), NOW)).toBe("Just now");
    expect(timeAgo(new Date(NOW - 5 * 60_000).toISOString(), NOW)).toBe("5m ago");
    expect(timeAgo(new Date(NOW - 3 * 3600_000).toISOString(), NOW)).toBe("3h ago");
    expect(timeAgo(new Date(NOW - 30 * 3600_000).toISOString(), NOW)).toBe("Yesterday");
  });
});

describe("NotificationBell", () => {
  it("opens the inbox instead of leaving the page", async () => {
    const load = vi.fn().mockResolvedValue({ items: [item({}), item({ id: "n2", kind: "report", title: "Your weekly report is ready", read: true })], unread: 1 });
    render(<NotificationBell initialUnread={1} load={load} onRead={vi.fn()} onReadAll={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Notifications, 1 unread" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    const panel = await screen.findByRole("dialog", { name: "Notifications" });
    expect(await within(panel).findByText("A post is taking off")).toBeInTheDocument();
    expect(within(panel).getByText("Your weekly report is ready")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: /Notification settings/ })).toHaveAttribute("href", "/settings#alerts");
    expect(push).not.toHaveBeenCalled();
  });

  it("marks a notification read and goes where it points", async () => {
    const onRead = vi.fn().mockResolvedValue(undefined);
    const load = vi.fn().mockResolvedValue({ items: [item({})], unread: 1 });
    render(<NotificationBell initialUnread={1} load={load} onRead={onRead} onReadAll={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    await userEvent.click(await screen.findByRole("button", { name: /A post is taking off/ }));
    expect(onRead).toHaveBeenCalledWith("n1");
    expect(push).toHaveBeenCalledWith("/content?post=p01");
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });

  it("marks everything read at once", async () => {
    const onReadAll = vi.fn().mockResolvedValue(undefined);
    const load = vi.fn().mockResolvedValue({ items: [item({}), item({ id: "n2" })], unread: 2 });
    render(<NotificationBell initialUnread={2} load={load} onRead={vi.fn()} onReadAll={onReadAll} />);
    await userEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Mark all as read" }));
    expect(onReadAll).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("Unread")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });

  it("says when there is nothing yet", async () => {
    render(<NotificationBell initialUnread={0} load={vi.fn().mockResolvedValue({ items: [], unread: 0 })} onRead={vi.fn()} onReadAll={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
  });
});

describe("placePanel", () => {
  // a bell near the right of a 390px phone, beside the avatar
  const phoneBell = { left: 278, right: 320, bottom: 62, width: 42 };

  it("spans a phone screen between its margins instead of running off the left", () => {
    const p = placePanel(phoneBell, 366, { width: 390, height: 844, phone: true, bottom: 760 });
    expect(p.right).toBeNull();
    expect(p.top).toBe(72);
  });

  it("stops above the tab bar on phones", () => {
    const p = placePanel(phoneBell, 366, { width: 390, height: 844, phone: true, bottom: 760 });
    expect(p.top + p.maxHeight).toBeLessThanOrEqual(760 - 12);
  });

  it("hangs from the bell on wider screens", () => {
    const p = placePanel({ left: 900, right: 942, bottom: 74, width: 42 }, 380, { width: 1280, height: 800, phone: false, bottom: null });
    expect(p.right).toBe(1280 - 942);
    expect(p.maxHeight).toBe(560);
  });

  it("keeps the panel inside the screen when the bell sits far from the right edge", () => {
    // tablet: 700px wide, bell ending 420px from the right; a 380px panel would cross the left edge
    const view = { width: 700, height: 1000, phone: false, bottom: null };
    const p = placePanel({ left: 238, right: 280, bottom: 74, width: 42 }, 380, view);
    const left = view.width - p.right! - 380;
    expect(left).toBeGreaterThanOrEqual(12);
    expect(p.right).toBeGreaterThanOrEqual(12);
  });

  it("grows out of the bell", () => {
    const p = placePanel({ left: 900, right: 942, bottom: 74, width: 42 }, 380, { width: 1280, height: 800, phone: false, bottom: null });
    const left = 1280 - p.right! - 380;
    expect(left + p.originX).toBe(921);
  });
});
