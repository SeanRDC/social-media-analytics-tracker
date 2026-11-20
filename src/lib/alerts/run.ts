/**
 * Daily job step: evaluate each user's alerts and send the new ones (once per
 * key) to their inbox, email and devices.
 */
import { describeError } from "@/lib/safe-error";
import { and, eq } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { alertSetting, connection, user } from "@/db/schema";
import { APP_NAME } from "@/lib/brand";
import { isoDate } from "@/lib/dates";
import { asOfDate } from "@/lib/data/compute";
import { loadDataset } from "@/lib/data/live";
import { deletionDate } from "@/lib/connect/service";
import { notify } from "@/lib/notifications";
import { ALERT_DEFAULTS, ALERT_KINDS, evaluateAlerts, type AlertKind } from "./evaluate";

export async function getAlertSettings(userId: string, db: Db = getDb()): Promise<Record<AlertKind, boolean>> {
  const rows = await db.select().from(alertSetting).where(eq(alertSetting.userId, userId));
  return { ...ALERT_DEFAULTS, ...Object.fromEntries(rows.map((r) => [r.kind, r.enabled])) };
}

export async function setAlertSetting(db: Db, userId: string, kind: AlertKind, enabled: boolean) {
  if (!ALERT_KINDS.includes(kind)) throw new Error("Unknown alert");
  await db.insert(alertSetting).values({ userId, kind, enabled }).onConflictDoUpdate({ target: [alertSetting.userId, alertSetting.kind], set: { enabled } });
}

const ALERT_FOOTER = `You get this because this alert is on. Change which alerts you get in ${APP_NAME} → Settings → Alerts.`;

export async function runAlerts(db: Db, now = new Date(), appUrl = process.env.BETTER_AUTH_URL ?? "") {
  const users = await db.selectDistinct({ id: user.id, email: user.email }).from(user).innerJoin(connection, eq(connection.userId, user.id));
  const result = { sent: 0, failed: 0 };
  for (const u of users) {
    try {
      const [settings, loaded, expiredRows] = await Promise.all([
        getAlertSettings(u.id, db),
        loadDataset(db, u.id, now),
        db
          .select({ platform: connection.platform, accessLostAt: connection.accessLostAt, updatedAt: connection.updatedAt })
          .from(connection)
          .where(and(eq(connection.userId, u.id), eq(connection.status, "expired"))),
      ]);
      const asOf = loaded ? asOfDate(loaded.dataset) : null;
      const alerts = evaluateAlerts(
        loaded?.dataset ?? null,
        asOf,
        expiredRows.map((r) => {
          const lost = r.accessLostAt ?? r.updatedAt;
          return { platform: r.platform, since: isoDate(lost), daysLeft: Math.ceil((deletionDate(lost).getTime() - now.getTime()) / 86_400_000) };
        }),
      ).filter((a) => settings[a.kind]);
      for (const a of alerts) {
        if (await notify(db, u, { ...a, footer: ALERT_FOOTER }, appUrl)) result.sent++;
      }
    } catch (e) {
      result.failed++;
      console.error(`[alerts] ${u.id} failed:`, describeError(e));
    }
  }
  return result;
}
