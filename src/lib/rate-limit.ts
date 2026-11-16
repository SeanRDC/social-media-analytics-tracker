/**
 * Fixed-window limits stored in Postgres, so they hold across serverless
 * instances. Shares the `rate_limit` table with Better Auth; app keys start
 * with "app:" so the two never collide.
 */
import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { rateLimit } from "@/db/schema";

export interface Limit {
  /** Allowed calls per window. */
  max: number;
  windowSeconds: number;
}

/** App limits, per signed-in user. */
export const LIMITS = {
  connect: { max: 20, windowSeconds: 3600 },
  import: { max: 6, windowSeconds: 3600 },
  export: { max: 60, windowSeconds: 3600 },
  push: { max: 20, windowSeconds: 3600 },
} satisfies Record<string, Limit>;

/** Counts one call against `key`; `ok` is false once the window's allowance is used up. */
export async function hit(db: Db, key: string, limit: Limit, now = Date.now()): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const windowMs = limit.windowSeconds * 1000;
  const fullKey = `app:${key}`;
  // a new window starts once the current one has passed
  const [row] = await db
    .insert(rateLimit)
    .values({ key: fullKey, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`case when ${now} - ${rateLimit.lastRequest} >= ${windowMs} then 1 else ${rateLimit.count} + 1 end`,
        lastRequest: sql`case when ${now} - ${rateLimit.lastRequest} >= ${windowMs} then ${now} else ${rateLimit.lastRequest} end`,
      },
    })
    .returning({ count: rateLimit.count, lastRequest: rateLimit.lastRequest });
  const ok = row.count <= limit.max;
  return { ok, retryAfterSeconds: ok ? 0 : Math.max(1, Math.ceil((row.lastRequest + windowMs - now) / 1000)) };
}
