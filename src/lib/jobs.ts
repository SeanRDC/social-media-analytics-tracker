/**
 * Background job plumbing: a database lease so two runs of the same job never
 * overlap, a `job_run` record per run for monitoring, and an optional webhook
 * when a run has failures. Works on Neon's pooled connections (no session locks).
 */
import { randomUUID } from "node:crypto";
import { and, desc, eq, lt } from "drizzle-orm";
import type { Db } from "@/db";
import { jobLease, jobRun } from "@/db/schema";
import { APP_NAME } from "@/lib/brand";
import { logEvent } from "@/lib/log";

export type JobOutcome<T> = { ran: false; reason: "already-running" } | { ran: true; ok: boolean; result?: T; error?: string };

/**
 * Runs `fn` while holding the lease `name` (expires after `ttlSeconds` in case
 * the process dies). `isOk` decides whether the result counts as a failure.
 */
export async function runJob<T>(db: Db, name: string, ttlSeconds: number, fn: () => Promise<T>, isOk: (r: T) => boolean = () => true): Promise<JobOutcome<T>> {
  const holder = randomUUID();
  const now = new Date();
  const lease = await db
    .insert(jobLease)
    .values({ name, holder, lockedUntil: new Date(now.getTime() + ttlSeconds * 1000) })
    .onConflictDoUpdate({ target: jobLease.name, set: { holder, lockedUntil: new Date(now.getTime() + ttlSeconds * 1000) }, setWhere: lt(jobLease.lockedUntil, now) })
    .returning({ holder: jobLease.holder });
  if (lease[0]?.holder !== holder) {
    logEvent("warn", "job_skipped", { job: name, reason: "already-running" });
    return { ran: false, reason: "already-running" };
  }

  const [run] = await db.insert(jobRun).values({ name, startedAt: now }).returning({ id: jobRun.id });
  let outcome: JobOutcome<T>;
  try {
    const result = await fn();
    outcome = { ran: true, ok: isOk(result), result };
  } catch (e) {
    outcome = { ran: true, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const summary = JSON.stringify(outcome.ran ? (outcome.result ?? { error: outcome.error }) : {});
  await db.update(jobRun).set({ finishedAt: new Date(), ok: outcome.ok, summary }).where(eq(jobRun.id, run.id));
  await db.delete(jobLease).where(and(eq(jobLease.name, name), eq(jobLease.holder, holder)));
  logEvent(outcome.ok ? "info" : "error", "job_finished", { job: name, ok: outcome.ok, summary });
  if (!outcome.ok) await notifyOps(`${APP_NAME}: the ${name} job had failures. ${summary}`);
  return outcome;
}

/** The most recent finished run of a job, for the health check. */
export async function lastRun(db: Db, name: string) {
  const [row] = await db.select().from(jobRun).where(eq(jobRun.name, name)).orderBy(desc(jobRun.startedAt)).limit(1);
  return row ?? null;
}

/** Posts to ALERT_WEBHOOK_URL (Slack- and Discord-style incoming webhooks) when set. Never throws. */
export async function notifyOps(text: string): Promise<void> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, content: text.slice(0, 1900) }) });
  } catch (e) {
    logEvent("warn", "ops_webhook_failed", { message: e instanceof Error ? e.message : String(e) });
  }
}
