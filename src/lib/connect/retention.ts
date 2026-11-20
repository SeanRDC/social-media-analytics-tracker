/**
 * Daily job step: a connection that has been without access for
 * ACCESS_GRACE_DAYS (the person revoked us on the platform, or the platform
 * ended our access and nobody reconnected) is deleted along with every
 * statistic and post we stored from it. YouTube's developer policies require
 * this within 7 days of revocation; Meta, TikTok and LinkedIn also expect
 * platform data to be deleted once we can no longer access it on the person's behalf.
 */
import { and, eq, lte } from "drizzle-orm";
import type { Db } from "@/db";
import { connection, user } from "@/db/schema";
import { APP_NAME } from "@/lib/brand";
import { isoDate } from "@/lib/dates";
import { sendEmail } from "@/lib/email";
import { recordNotification } from "@/lib/notifications";
import { PLATFORM_NAMES } from "@/lib/platforms";
import { describeError } from "@/lib/safe-error";
import { ACCESS_GRACE_DAYS } from "./service";

export async function purgeLostAccess(db: Db, now = new Date(), appUrl = process.env.BETTER_AUTH_URL ?? "") {
  const cutoff = new Date(now.getTime() - ACCESS_GRACE_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: connection.id, userId: connection.userId, platform: connection.platform, accessLostAt: connection.accessLostAt, email: user.email })
    .from(connection)
    .innerJoin(user, eq(user.id, connection.userId))
    .where(and(eq(connection.status, "expired"), lte(connection.accessLostAt, cutoff)));

  const result = { deleted: 0, failed: 0 };
  for (const r of rows) {
    try {
      // statistics, posts and audience rows go with the connection (cascade)
      await db.delete(connection).where(eq(connection.id, r.id));
      result.deleted++;
      const name = PLATFORM_NAMES[r.platform];
      const title = `We deleted your ${name} data`;
      const body = `${name} stopped sharing your statistics with us ${ACCESS_GRACE_DAYS} days ago and wasn't reconnected, so we deleted everything we stored from it. Connect it again any time to start a fresh history.`;
      await recordNotification(db, r.userId, { kind: "reconnect", key: `${r.platform}:${r.accessLostAt ? isoDate(r.accessLostAt) : "unknown"}:deleted`, title, body, url: "/settings" });
      const link = `${appUrl.replace(/\/$/, "")}/settings`;
      await sendEmail({
        to: r.email,
        subject: title,
        text: `${body}\n\n${link}\n\n${APP_NAME}`,
        html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#16181c;max-width:560px;margin:0 auto;padding:24px"><h1 style="font-size:20px">${title}</h1><p>${body}</p><p><a href="${link}">Open ${APP_NAME} settings</a></p></div>`,
      }).catch((e) => console.error(`[retention] email to ${r.userId} failed:`, describeError(e)));
    } catch (e) {
      result.failed++;
      console.error(`[retention] ${r.id} failed:`, describeError(e));
    }
  }
  return result;
}
