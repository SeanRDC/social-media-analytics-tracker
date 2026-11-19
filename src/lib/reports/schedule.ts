/**
 * The weekly email: stored schedule, the "is it due" rule, and the sender the
 * daily job runs. A report is due once the chosen weekday and hour have passed
 * in the person's time zone and it hasn't gone out since, so a daily cron sends
 * it at its next run and an hourly cron sends it on the hour.
 */
import { describeError } from "@/lib/safe-error";
import { eq } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { reportSchedule, user } from "@/db/schema";
import { asOfDate } from "@/lib/data/compute";
import { loadDataset } from "@/lib/data/live";
import { sendEmail } from "@/lib/email";
import { buildReport } from "./build";
import { reportDataFrom } from "./data";
import { renderReportEmail } from "./email";

export interface ScheduleView {
  enabled: boolean;
  /** 1 = Monday … 7 = Sunday */
  dayOfWeek: number;
  hour: number;
  timezone: string;
}

/** Off until the person turns it on: no email without asking. */
export const DEFAULT_SCHEDULE: ScheduleView = { enabled: false, dayOfWeek: 1, hour: 9, timezone: "UTC" };

export async function getSchedule(userId: string, db: Db = getDb()): Promise<ScheduleView> {
  const [row] = await db.select().from(reportSchedule).where(eq(reportSchedule.userId, userId));
  return row ? { enabled: row.enabled, dayOfWeek: row.dayOfWeek, hour: row.hour, timezone: row.timezone } : DEFAULT_SCHEDULE;
}

const validZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
};

/**
 * Saves the schedule. Counting it as "sent now" means a time that has already
 * passed this week waits for next week instead of sending at once.
 */
export async function saveScheduleFor(db: Db, userId: string, v: ScheduleView, now = new Date()) {
  const values = {
    enabled: v.enabled,
    dayOfWeek: Math.min(7, Math.max(1, Math.round(v.dayOfWeek))),
    hour: Math.min(23, Math.max(0, Math.round(v.hour))),
    timezone: validZone(v.timezone),
    lastSentAt: now,
  };
  await db.insert(reportSchedule).values({ userId, ...values }).onConflictDoUpdate({ target: reportSchedule.userId, set: values });
}

/** The most recent scheduled moment at or before `now`. */
export function lastOccurrence(s: Pick<ScheduleView, "dayOfWeek" | "hour" | "timezone">, now: Date): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: validZone(s.timezone), weekday: "short", hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday) + 1;
  const hour = Number(parts.hour);
  let daysBack = (weekday - s.dayOfWeek + 7) % 7;
  if (daysBack === 0 && hour < s.hour) daysBack = 7;
  const offsetMs = (daysBack * 24 + (hour - s.hour)) * 3_600_000 + Number(parts.minute) * 60_000 + Number(parts.second) * 1000;
  return new Date(now.getTime() - offsetMs - (now.getTime() % 1000));
}

export function isDue(s: ScheduleView, lastSentAt: Date | null, now: Date): boolean {
  if (!s.enabled) return false;
  const due = lastOccurrence(s, now);
  return !lastSentAt || lastSentAt < due;
}

/** Daily job: send every weekly email that is due. People with nothing imported are skipped. */
export async function sendWeeklyReports(db: Db, now = new Date(), appUrl = process.env.BETTER_AUTH_URL ?? "") {
  const rows = await db
    .select({ s: reportSchedule, email: user.email })
    .from(reportSchedule)
    .innerJoin(user, eq(user.id, reportSchedule.userId))
    .where(eq(reportSchedule.enabled, true));
  const result = { sent: 0, skipped: 0, failed: 0 };
  for (const { s, email } of rows) {
    if (!isDue(s, s.lastSentAt, now)) continue;
    try {
      const loaded = await loadDataset(db, s.userId, now);
      const asOf = loaded && asOfDate(loaded.dataset);
      if (!loaded || !asOf) {
        result.skipped++;
        continue;
      }
      const report = buildReport("weekly", reportDataFrom(loaded.dataset, asOf));
      await sendEmail({ to: email, ...renderReportEmail(report, appUrl) });
      await db.update(reportSchedule).set({ lastSentAt: now }).where(eq(reportSchedule.userId, s.userId));
      result.sent++;
    } catch (e) {
      result.failed++;
      console.error(`[weekly email] ${s.userId} failed:`, describeError(e));
    }
  }
  return result;
}
