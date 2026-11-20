import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Notification } from "@/lib/notifications";
import { NotificationBell, timeAgo } from "../NotificationBell";

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
