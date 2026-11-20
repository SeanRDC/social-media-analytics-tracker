/**
 * Notifications: the in-app inbox under the bell (stored in `alert_event`) and
 * `notify()`, which records one and delivers it by email and push.
 */
import { and, count, desc, eq, isNull, ne } from "drizzle-orm";
import type { Db } from "@/db";
import { alertEvent } from "@/db/schema";
import { APP_NAME } from "@/lib/brand";
import { sendEmail } from "@/lib/email";
import { appLink, emailFrame } from "@/lib/emails/layout";
import { sendPush } from "@/lib/push";
import { describeError } from "@/lib/safe-error";

export type NotificationKind = (typeof alertEvent.$inferSelect)["kind"];

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Path in the app to open. */
  url: string;
  /** ISO timestamp. */
  createdAt: string;
  read: boolean;
}

export const INBOX_SIZE = 30;

// rows from before the inbox existed have no text, so they stay out of it
const visible = (userId: string) => and(eq(alertEvent.userId, userId), ne(alertEvent.title, ""));

export async function listNotifications(db: Db, userId: string, limit = INBOX_SIZE): Promise<Notification[]> {
  const rows = await db.select().from(alertEvent).where(visible(userId)).orderBy(desc(alertEvent.createdAt)).limit(limit);
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    url: r.url || "/overview",
    createdAt: r.createdAt.toISOString(),
    read: r.readAt !== null,
  }));
}

export async function unreadCount(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(alertEvent)
    .where(and(visible(userId), isNull(alertEvent.readAt)));
  return row?.n ?? 0;
}

export async function markRead(db: Db, userId: string, id: string, now = new Date()): Promise<void> {
  await db
    .update(alertEvent)
    .set({ readAt: now })
    .where(and(eq(alertEvent.userId, userId), eq(alertEvent.id, id), isNull(alertEvent.readAt)));
}

export async function markAllRead(db: Db, userId: string, now = new Date()): Promise<void> {
  await db
    .update(alertEvent)
    .set({ readAt: now })
    .where(and(eq(alertEvent.userId, userId), isNull(alertEvent.readAt)));
}

/** Records a notification once per key; returns false when it already existed. */
export async function recordNotification(
  db: Db,
  userId: string,
  n: { kind: NotificationKind; key: string; title: string; body: string; url: string },
): Promise<boolean> {
  const inserted = await db
    .insert(alertEvent)
    .values({ userId, ...n })
    .onConflictDoNothing()
    .returning({ id: alertEvent.id });
  return inserted.length > 0;
}

export interface NotifyInput {
  kind: NotificationKind;
  key: string;
  title: string;
  body: string;
  /** Path in the app to open. */
  url: string;
  /** Why the person got this email, shown under it. */
  footer: string;
  /** Label of the email's button. */
  actionLabel?: string;
}

/**
 * The one way to tell someone something: saves it to their inbox (once per
 * kind and key, so a retried job never repeats it), then sends it by email in
 * the branded frame and by web push. Returns false when it was already sent.
 * Delivery failures don't undo the inbox entry; the person still sees it there.
 */
export async function notify(db: Db, to: { id: string; email: string }, n: NotifyInput, appUrl = process.env.BETTER_AUTH_URL ?? ""): Promise<boolean> {
  if (!(await recordNotification(db, to.id, { kind: n.kind, key: n.key, title: n.title, body: n.body, url: n.url }))) return false;
  const link = appUrl ? appLink(appUrl, n.url) : n.url;
  const results = await Promise.allSettled([
    sendEmail({
      to: to.email,
      subject: n.title,
      text: `${n.body}\n\n${link}\n\n${n.footer}`,
      html: emailFrame({ preheader: n.body, heading: n.title, intro: n.body, action: { href: link, label: n.actionLabel ?? `Open ${APP_NAME}` }, footer: n.footer }),
    }),
    sendPush(db, to.id, { title: n.title, body: n.body, url: n.url }),
  ]);
  for (const r of results) if (r.status === "rejected") console.error(`[notify] ${n.kind} delivery to ${to.id} failed:`, describeError(r.reason));
  return true;
}
