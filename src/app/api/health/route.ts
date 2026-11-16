import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/db";
import { lastRun } from "@/lib/jobs";

/** How long without a nightly run before the check reports it as late. */
const NIGHTLY_LATE_HOURS = 30;

/**
 * Health check for uptime monitors. Public, so it shares nothing personal:
 * whether the database answers and when the nightly job last ran.
 */
export async function GET() {
  await connection();
  const headers = { "Cache-Control": "no-store" };
  try {
    const db = getDb();
    await db.execute(sql`select 1`);
    const run = await lastRun(db, "daily");
    const hoursAgo = run ? (Date.now() - run.startedAt.getTime()) / 3_600_000 : null;
    const nightly = run ? { lastRunAt: run.startedAt.toISOString(), ok: run.ok, late: hoursAgo! > NIGHTLY_LATE_HOURS } : null;
    return Response.json({ ok: true, database: "up", nightly }, { headers });
  } catch {
    return Response.json({ ok: false, database: "down" }, { status: 503, headers });
  }
}
