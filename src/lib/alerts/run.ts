/**
 * Daily job step: evaluate each user's alerts, record the new ones (once per
 * key), and deliver them by email and web push.
 */
import { describeError } from "@/lib/safe-error";
import { and, eq } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { alertEvent, alertSetting, connection, user } from "@/db/schema";
import { APP_NAME } from "@/lib/brand";
import { isoDate } from "@/lib/dates";
import { asOfDate } from "@/lib/data/compute";
import { loadDataset } from "@/lib/data/live";
import { sendEmail } from "@/lib/email";
import { sendPush } from "@/lib/push";
import { ALERT_DEFAULTS, ALERT_KINDS, evaluateAlerts, type Alert, type AlertKind } from "./evaluate";

export async function getAlertSettings(userId: string, db: Db = getDb()): Promise<Record<AlertKind, boolean>> {
  const rows = await db.select().from(alertSetting).where(eq(alertSetting.userId, userId));
  return { ...ALERT_DEFAULTS, ...Object.fromEntries(rows.map((r) => [r.kind, r.enabled])) };
}

export async function setAlertSetting(db: Db, userId: string, kind: AlertKind, enabled: boolean) {
  if (!ALERT_KINDS.includes(kind)) throw new Error("Unknown alert");
  await db.insert(alertSetting).values({ userId, kind, enabled }).onConflictDoUpdate({ target: [alertSetting.userId, alertSetting.kind], set: { enabled } });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function deliver(db: Db, userId: string, email: string, a: Alert, appUrl: string) {
  const link = appUrl ? `${appUrl.replace(/\/$/, "")}${a.url}` : a.url;
  await Promise.allSettled([
    sendEmail({
      to: email,
      subject: a.title,
      text: `${a.body}\n\n${link}\n\nChange which alerts you get in ${APP_NAME} → Settings → Alerts.`,
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#16181c;max-width:560px;margin:0 auto;padding:24px"><h1 style="font-size:20px">${esc(a.title)}</h1><p>${esc(a.body)}</p><p><a href="${esc(link)}">Open ${esc(APP_NAME)}</a></p><p style="color:#8a93a1;font-size:12px">Change which alerts you get in Settings → Alerts.</p></div>`,
    }),
    sendPush(db, userId, { title: a.title, body: a.body, url: a.url }),
  ]);
}

export async function runAlerts(db: Db, now = new Date(), appUrl = process.env.BETTER_AUTH_URL ?? "") {
  const users = await db.selectDistinct({ id: user.id, email: user.email }).from(user).innerJoin(connection, eq(connection.userId, user.id));
  const result = { sent: 0, failed: 0 };
  for (const u of users) {
    try {
      const [settings, loaded, expiredRows] = await Promise.all([
        getAlertSettings(u.id, db),
        loadDataset(db, u.id, now),
        db
          .select({ platform: connection.platform, updatedAt: connection.updatedAt })
          .from(connection)
          .where(and(eq(connection.userId, u.id), eq(connection.status, "expired"))),
      ]);
      const asOf = loaded ? asOfDate(loaded.dataset) : null;
      const alerts = evaluateAlerts(
        loaded?.dataset ?? null,
        asOf,
        expiredRows.map((r) => ({ platform: r.platform, since: isoDate(r.updatedAt) })),
      ).filter((a) => settings[a.kind]);
      for (const a of alerts) {
        // recorded before sending, so a retry never sends the same alert twice
        const inserted = await db.insert(alertEvent).values({ userId: u.id, kind: a.kind, key: a.key }).onConflictDoNothing().returning({ id: alertEvent.id });
        if (!inserted.length) continue;
        await deliver(db, u.id, u.email, a, appUrl);
        result.sent++;
      }
    } catch (e) {
      result.failed++;
      console.error(`[alerts] ${u.id} failed:`, describeError(e));
    }
  }
  return result;
}
