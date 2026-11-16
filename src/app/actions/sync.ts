"use server";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { connection } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { PLATFORM_ORDER, type PlatformId } from "@/lib/data/types";
import { hit, LIMITS } from "@/lib/rate-limit";
import { syncConnection } from "@/lib/sync/service";

export type ImportOutcome = "imported" | "not-yet" | "reconnect" | "busy" | "failed";

/**
 * Imports one of the signed-in user's platforms now (the first import after
 * connecting). "not-yet" means the platform's import arrives in a later phase.
 */
export async function importPlatform(platform: PlatformId): Promise<ImportOutcome> {
  const user = await requireUser();
  if (!PLATFORM_ORDER.includes(platform)) return "failed";
  const db = getDb();
  if (!(await hit(db, `import:${user.id}:${platform}`, LIMITS.import)).ok) return "busy";
  const [row] = await db
    .select({ id: connection.id })
    .from(connection)
    .where(and(eq(connection.userId, user.id), eq(connection.platform, platform)));
  if (!row) return "failed";
  try {
    const out = await syncConnection(db, row.id);
    if (out.status === "synced") return "imported";
    if (out.status === "unsupported") return "not-yet";
    if (out.status === "deferred") return "busy";
    return out.status === "expired" ? "reconnect" : "failed";
  } catch (e) {
    console.error(`[import] ${platform} failed:`, e instanceof Error ? e.message : e);
    return "failed";
  }
}
