/**
 * Error descriptions that are safe to log. Database errors carry the query's
 * parameter values (a Better Auth session lookup carries the session token), so
 * those values are never included: only the query text and the cause.
 */
import { DrizzleQueryError } from "drizzle-orm/errors";
import { logEvent } from "./log";

const MAX = 300;

/** Removes a "params: …" tail, the form Drizzle uses to print a failed query's values. */
const redact = (text: string) => text.replace(/\bparams:[\s\S]*$/i, "params: [redacted]");

const cap = (text: string) => (text.length > MAX ? `${text.slice(0, MAX - 1)}…` : text);

function causeOf(e: Error): string {
  const c = e.cause as (Error & { code?: string }) | undefined;
  if (!c) return "";
  const code = typeof c.code === "string" && !c.message.includes(c.code) ? `${c.code} ` : "";
  return ` (cause: ${code}${redact(c.message)})`;
}

export function describeError(e: unknown): string {
  if (e instanceof DrizzleQueryError) {
    // the cause is what says what went wrong: shorten a long query (a bulk insert) rather than lose it
    const cause = causeOf(e);
    const prefix = "Database query failed: ";
    const room = Math.max(60, MAX - prefix.length - cause.length);
    const query = e.query.replace(/\s+/g, " ");
    return cap(`${prefix}${query.length > room ? `${query.slice(0, room - 1)}…` : query}${cause}`);
  }
  if (e instanceof Error) return cap(redact(`${e.name}: ${e.message}`) + causeOf(e));
  return cap(redact(String(e)));
}

type AuthLevel = "debug" | "info" | "warn" | "error";

/** Better Auth's `logger.log`: one JSON line per message, errors described safely. */
export function authLog(level: AuthLevel, message: string, ...args: unknown[]): void {
  if (level === "debug") return;
  const detail = args.length ? args.map(describeError).join(" | ") : undefined;
  logEvent(level, "auth", { message: cap(redact(message)), detail });
}
