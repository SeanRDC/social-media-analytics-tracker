import { createHash, timingSafeEqual } from "node:crypto";
import { getDb } from "@/db";
import { refreshExpiring } from "@/lib/connect/service";
import { syncAll } from "@/lib/sync/service";

/** Imports can take a while across many accounts. */
export const maxDuration = 300;

const digest = (s: string) => createHash("sha256").update(s).digest();

/**
 * Daily job (vercel.json): refreshes platform tokens before they lapse, then
 * saves today's snapshot for every connected account.
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("CRON_SECRET is not set", { status: 503 });
  const given = request.headers.get("authorization") ?? "";
  if (!timingSafeEqual(digest(given), digest(`Bearer ${secret}`))) return new Response("Unauthorized", { status: 401 });

  const db = getDb();
  const tokens = await refreshExpiring(db);
  const sync = await syncAll(db);
  return Response.json({ tokens, sync });
}
