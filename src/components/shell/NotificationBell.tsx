"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/components/icons/Icon";
import { useDismiss } from "@/hooks/useDismiss";
import type { Notification, NotificationKind } from "@/lib/notifications";
import s from "./NotificationBell.module.css";

const KIND_ICON: Record<NotificationKind, IconName> = {
  spike: "chart",
  milestone: "users",
  drop: "down",
  reconnect: "alert",
  report: "mail",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Just now", "5m ago", "3h ago", "Yesterday", "Nov 11". */
export function timeAgo(iso: string, now = Date.now()): string {
  const mins = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

interface Props {
  initialUnread: number;
  load: () => Promise<{ items: Notification[]; unread: number }>;
  onRead: (id: string) => Promise<void>;
  onReadAll: () => Promise<void>;
}

/**
 * Bell in the navbar: shows how many notifications are unread and opens the
 * inbox in a panel portalled to <body> so page cards never cover it.
 */
export function NotificationBell({ initialUnread, load, onRead, onReadAll }: Props) {
  // the inbox remembers the page it was opened on, so it closes when the route changes
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (on: boolean) => setOpenOn(on ? pathname : null);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [unread, setUnread] = useState(initialUnread);
  const [failed, setFailed] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const router = useRouter();

  const refresh = useCallback(async () => {
    setFailed(false);
    try {
      const r = await load();
      setItems(r.items);
      setUnread(r.unread);
    } catch {
      setFailed(true);
    }
  }, [load]);

  // a new server render (navigation, refresh) brings a fresh count
  const [seenInitial, setSeenInitial] = useState(initialUnread);
  if (seenInitial !== initialUnread) {
    setSeenInitial(initialUnread);
    setUnread(initialUnread);
  }

  const toggle = () => {
    if (open) return setOpen(false);
    setOpen(true);
    void refresh();
  };

  useDismiss(open, [button, panel], (reason) => {
    setOpenOn(null);
    if (reason === "escape") button.current?.focus();
  });

  // pinned under the bell, right edges aligned, kept inside the screen
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const b = button.current?.getBoundingClientRect();
      const p = panel.current;
      if (!b || !p) return;
      p.style.top = `${b.bottom + 10}px`;
      p.style.right = `${Math.max(12, window.innerWidth - b.right)}px`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  const openItem = (n: Notification) => {
    if (!n.read) {
      setItems((xs) => xs?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? xs);
      setUnread((u) => Math.max(0, u - 1));
      void onRead(n.id).catch(() => {});
    }
    setOpen(false);
    router.push(n.url);
  };

  const readAll = () => {
    setItems((xs) => xs?.map((x) => ({ ...x, read: true })) ?? xs);
    setUnread(0);
    void onReadAll().catch(() => void refresh());
  };

  const label = unread ? `Notifications, ${unread} unread` : "Notifications";

  return (
    <>
      <button
        ref={button}
        type="button"
        className={s.bell}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        data-open={open}
        onClick={toggle}
      >
        <Icon name="bell" size={18} />
        {unread > 0 && (
          <span className={s.count} aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open &&
        createPortal(
          <div ref={panel} id={id} role="dialog" aria-label="Notifications" className={s.panel}>
            <div className={s.head}>
              <h2 className={s.title}>Notifications</h2>
              {unread > 0 && (
                <button type="button" className={s.readAll} onClick={readAll}>
                  Mark all as read
                </button>
              )}
            </div>

            <div className={s.body}>
              {failed ? (
                <p className={s.empty} role="alert">
                  Couldn&apos;t load notifications.{" "}
                  <button type="button" className={s.retry} onClick={() => void refresh()}>
                    Try again
                  </button>
                </p>
              ) : items === null ? (
                <div className={s.loading} role="status" aria-label="Loading notifications">
                  <span />
                  <span />
                  <span />
                </div>
              ) : items.length === 0 ? (
                <div className={s.empty}>
                  <span className={s.emptyIcon}>
                    <Icon name="bell" size={20} />
                  </span>
                  <b>You&apos;re all caught up</b>
                  <p>We&apos;ll let you know here when a post takes off, you pass a follower milestone, engagement drops, an account needs reconnecting or your weekly report goes out.</p>
                </div>
              ) : (
                <ul className={s.list}>
                  {items.map((n) => (
                    <li key={n.id}>
                      <button type="button" className={s.item} data-read={n.read} onClick={() => openItem(n)}>
                        <span className={s.icon} data-kind={n.kind} aria-hidden="true">
                          <Icon name={KIND_ICON[n.kind] ?? "bell"} size={16} />
                        </span>
                        <span className={s.text}>
                          <b>{n.title}</b>
                          <span className={s.msg}>{n.body}</span>
                          <time className={s.time} dateTime={n.createdAt}>
                            {timeAgo(n.createdAt)}
                          </time>
                        </span>
                        {!n.read && (
                          <span className={s.dot}>
                            <span className="sr-only">Unread</span>
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Link href="/settings#alerts" className={s.foot} onClick={() => setOpen(false)}>
              <Icon name="gear" size={15} />
              Notification settings
            </Link>
          </div>,
          document.body,
        )}
    </>
  );
}
