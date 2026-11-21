/**
 * The order someone arranged their platform cards in (Platforms tab). Stored
 * per account, so it follows them across devices; applies to those cards only.
 */
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { platformOrder } from "@/db/schema";
import { PLATFORM_ORDER, type PlatformId } from "@/lib/data/types";

/**
 * Turns anything into a full, valid order: known platform ids, each once,
 * in the order given, with any missing ones after them in the default order.
 * Unknown values and repeats are dropped, so a stored or posted order can never
 * hide a platform or show one twice.
 */
export function normalizeOrder(input: unknown): PlatformId[] {
  const given = Array.isArray(input) ? input : [];
  const seen = new Set<PlatformId>();
  for (const v of given) if (typeof v === "string" && (PLATFORM_ORDER as readonly string[]).includes(v)) seen.add(v as PlatformId);
  for (const id of PLATFORM_ORDER) seen.add(id);
  return [...seen];
}

/** Whether an order is the default one (nothing to save or reset). */
export const isDefaultOrder = (order: readonly PlatformId[]) => normalizeOrder(order).every((id, i) => id === PLATFORM_ORDER[i]);

/** Sorts items that carry a platform `id` into the given order. */
export function inOrder<T extends { id: PlatformId }>(items: readonly T[], order: readonly PlatformId[]): T[] {
  const rank = new Map(normalizeOrder(order).map((id, i) => [id, i]));
  return [...items].sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
}

/** The person's saved order, or the default. */
export async function loadPlatformOrder(db: Db, userId: string): Promise<PlatformId[]> {
  const [row] = await db.select({ platforms: platformOrder.platforms }).from(platformOrder).where(eq(platformOrder.userId, userId));
  return normalizeOrder(row?.platforms);
}

/** Saves the person's order; the default order is stored as no row at all. */
export async function storePlatformOrder(db: Db, userId: string, order: unknown): Promise<PlatformId[]> {
  const clean = normalizeOrder(order);
  if (isDefaultOrder(clean)) {
    await db.delete(platformOrder).where(eq(platformOrder.userId, userId));
  } else {
    await db
      .insert(platformOrder)
      .values({ userId, platforms: clean })
      .onConflictDoUpdate({ target: platformOrder.userId, set: { platforms: clean, updatedAt: new Date() } });
  }
  return clean;
}
