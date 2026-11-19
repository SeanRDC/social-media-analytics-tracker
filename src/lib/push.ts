/**
 * Web push (VAPID). Optional: without NEXT_PUBLIC_VAPID_PUBLIC_KEY and
 * VAPID_PRIVATE_KEY the option stays hidden and nothing is sent.
 */
import { describeError } from "@/lib/safe-error";
import { eq } from "drizzle-orm";
import webpush from "web-push";
import type { Db } from "@/db";
import { pushSubscription } from "@/db/schema";

export const vapidPublicKey = () => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
export const pushConfigured = () => Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

/** web-push needs a contact: mailto: or an https URL. */
function subject() {
  if (process.env.VAPID_SUBJECT) return process.env.VAPID_SUBJECT;
  if (process.env.LEGAL_CONTACT_EMAIL) return `mailto:${process.env.LEGAL_CONTACT_EMAIL}`;
  const url = process.env.BETTER_AUTH_URL ?? "";
  return url.startsWith("https://") ? url : "mailto:noreply@example.com";
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

export interface BrowserSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function savePushSubscription(db: Db, userId: string, sub: BrowserSubscription) {
  const values = { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth };
  // a browser's endpoint belongs to whoever subscribed last on it
  await db.insert(pushSubscription).values(values).onConflictDoUpdate({ target: pushSubscription.endpoint, set: values });
}

/** Sends to every device the user subscribed; subscriptions the push service no longer knows are removed. */
export async function sendPush(db: Db, userId: string, payload: PushPayload): Promise<number> {
  if (!pushConfigured()) return 0;
  webpush.setVapidDetails(subject(), process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const subs = await db.select().from(pushSubscription).where(eq(pushSubscription.userId, userId));
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await db.delete(pushSubscription).where(eq(pushSubscription.id, s.id));
      else console.error("[push] send failed:", status ?? describeError(e));
    }
  }
  return sent;
}
