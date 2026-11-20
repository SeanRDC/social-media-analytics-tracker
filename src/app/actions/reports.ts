"use server";

import { getDb } from "@/db";
import { requireUser } from "@/lib/dal";
import { rememberTimeZone, saveScheduleFor, type ScheduleView } from "@/lib/reports/schedule";

/** Saves the signed-in user's weekly email schedule. */
export async function saveSchedule(v: ScheduleView): Promise<void> {
  const user = await requireUser();
  await saveScheduleFor(getDb(), user.id, { enabled: Boolean(v.enabled), dayOfWeek: Number(v.dayOfWeek), hour: Number(v.hour), timezone: String(v.timezone) });
}

/** Saves the device's time zone if the signed-in user has none yet. */
export async function rememberMyTimeZone(timezone: string): Promise<void> {
  const user = await requireUser();
  await rememberTimeZone(getDb(), user.id, String(timezone).slice(0, 64));
}
