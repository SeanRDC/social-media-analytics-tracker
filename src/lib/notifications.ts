/**
 * In-app notification inbox. Every alert the daily job sends (and each weekly
 * report) is stored in `alert_event`; this reads it back for the bell menu.
 */
import { and, count, desc, eq, isNull, ne } from "drizzle-orm";
import type { Db } from "@/db";
import { alertEvent } from "@/db/schema";

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
