"use server";

import { getDb } from "@/db";
import { requireUser } from "@/lib/dal";
import { listNotifications, markAllRead, markRead, unreadCount, type Notification } from "@/lib/notifications";

export async function getNotifications(): Promise<{ items: Notification[]; unread: number }> {
  const user = await requireUser();
  const db = getDb();
  const [items, unread] = await Promise.all([listNotifications(db, user.id), unreadCount(db, user.id)]);
  return { items, unread };
}

export async function readNotification(id: string): Promise<void> {
  const user = await requireUser();
  await markRead(getDb(), user.id, String(id));
}

export async function readAllNotifications(): Promise<void> {
  const user = await requireUser();
  await markAllRead(getDb(), user.id);
}
