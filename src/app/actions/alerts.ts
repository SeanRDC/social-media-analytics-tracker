"use server";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { pushSubscription } from "@/db/schema";
import { ALERT_KINDS, type AlertKind } from "@/lib/alerts/evaluate";
import { setAlertSetting } from "@/lib/alerts/run";
import { requireUser } from "@/lib/dal";
import { savePushSubscription, type BrowserSubscription } from "@/lib/push";

export async function setAlert(kind: AlertKind, enabled: boolean): Promise<void> {
  const user = await requireUser();
  if (!ALERT_KINDS.includes(kind)) throw new Error("Unknown alert");
  await setAlertSetting(getDb(), user.id, kind, Boolean(enabled));
}

const isSubscription = (s: unknown): s is BrowserSubscription => {
  const x = s as BrowserSubscription;
  return typeof x?.endpoint === "string" && x.endpoint.startsWith("https://") && typeof x.keys?.p256dh === "string" && typeof x.keys?.auth === "string";
};

/** Stores this browser's push subscription for the signed-in user. */
export async function subscribePush(sub: BrowserSubscription): Promise<void> {
  const user = await requireUser();
  if (!isSubscription(sub)) throw new Error("Invalid subscription");
  await savePushSubscription(getDb(), user.id, { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  const user = await requireUser();
  await getDb()
    .delete(pushSubscription)
    .where(and(eq(pushSubscription.userId, user.id), eq(pushSubscription.endpoint, String(endpoint))));
}
