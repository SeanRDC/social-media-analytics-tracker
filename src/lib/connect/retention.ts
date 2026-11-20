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
import { DAY_MS, isoDate } from "@/lib/dates";
import { notify } from "@/lib/notifications";
import { PLATFORM_NAMES } from "@/lib/platforms";
import { describeError } from "@/lib/safe-error";
import { ACCESS_GRACE_DAYS } from "./service";

export async function purgeLostAccess(db: Db, now = new Date(), appUrl = process.env.BETTER_AUTH_URL ?? "") {
  const cutoff = new Date(now.getTime() - ACCESS_GRACE_DAYS * DAY_MS);
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
      await notify(
        db,
        { id: r.userId, email: r.email },
        {
          kind: "reconnect",
          key: `${r.platform}:${r.accessLostAt ? isoDate(r.accessLostAt) : "unknown"}:deleted`,
          title: `We deleted your ${name} data`,
          body: `${name} stopped sharing your statistics with us ${ACCESS_GRACE_DAYS} days ago and wasn't reconnected, so we deleted everything we stored from it. Connect it again any time to start a fresh history.`,
          url: "/settings",
          actionLabel: "Open settings",
          footer: `We tell you whenever we delete data we stored for you in ${APP_NAME}.`,
        },
        appUrl,
      );
    } catch (e) {
      result.failed++;
      console.error(`[retention] ${r.id} failed:`, describeError(e));
    }
  }
  return result;
}
