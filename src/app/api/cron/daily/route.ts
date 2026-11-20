import { createHash, timingSafeEqual } from "node:crypto";
import { getDb } from "@/db";
import { refreshExpiring } from "@/lib/connect/service";
import { runAlerts } from "@/lib/alerts/run";
import { purgeLostAccess } from "@/lib/connect/retention";
import { runJob } from "@/lib/jobs";
import { sendWeeklyReports } from "@/lib/reports/schedule";
import { syncAll } from "@/lib/sync/service";

/** Imports can take a while across many accounts. */
export const maxDuration = 300;

const digest = (s: string) => createHash("sha256").update(s).digest();

/**
 * Daily job (vercel.json): refreshes platform tokens before they lapse, saves
 * today's snapshot for every connected account, then sends weekly emails that
 * are due and any new alerts, and finally deletes connections that have been
 * without access for 7 days. Each step carries on if the one before had failures.
 * Runs under a lease (overlapping runs are skipped) and is scheduled twice a
 * night: every step is idempotent, so the second run only finishes what the
 * first ran out of time for.
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("CRON_SECRET is not set", { status: 503 });
  const given = request.headers.get("authorization") ?? "";
  if (!timingSafeEqual(digest(given), digest(`Bearer ${secret}`))) return new Response("Unauthorized", { status: 401 });

  const db = getDb();
  const outcome = await runJob(
    db,
    "daily",
    10 * 60,
    async () => {
      const tokens = await refreshExpiring(db);
      const sync = await syncAll(db);
      const weeklyEmails = await sendWeeklyReports(db);
      const alerts = await runAlerts(db);
      // last, so a connection that came back during this run keeps its data
      const retention = await purgeLostAccess(db);
      return { tokens, sync, weeklyEmails, alerts, retention };
    },
    (r) => r.tokens.failed + r.sync.failed + r.weeklyEmails.failed + r.alerts.failed + r.retention.failed === 0,
  );
  return Response.json(outcome, { status: outcome.ran && !outcome.ok && outcome.error ? 500 : 200 });
}
