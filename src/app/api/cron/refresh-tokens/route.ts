import { createHash, timingSafeEqual } from "node:crypto";
import { getDb } from "@/db";
import { refreshExpiring } from "@/lib/connect/service";

const digest = (s: string) => createHash("sha256").update(s).digest();

/**
 * Daily job (vercel.json): refreshes platform tokens before they lapse and marks
 * the ones that cannot be refreshed as expired, so Settings asks to reconnect.
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("CRON_SECRET is not set", { status: 503 });
  const given = request.headers.get("authorization") ?? "";
  if (!timingSafeEqual(digest(given), digest(`Bearer ${secret}`))) return new Response("Unauthorized", { status: 401 });

  const result = await refreshExpiring(getDb());
  return Response.json(result);
}
