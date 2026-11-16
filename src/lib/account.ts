import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { connection, user } from "@/db/schema";
import { disconnect } from "@/lib/connect/service";

/**
 * Deletes a person and everything about them: first each platform connection
 * (asking the platform to revoke our access), then the user row, which
 * cascades to sessions, sign-in accounts, stats, posts, audience, schedules,
 * alerts and push subscriptions.
 */
export async function deleteAccountData(db: Db, userId: string): Promise<void> {
  const conns = await db.select({ platform: connection.platform }).from(connection).where(eq(connection.userId, userId));
  for (const c of conns) await disconnect(db, userId, c.platform);
  await db.delete(user).where(eq(user.id, userId));
}
