"use server";

import { getDb } from "@/db";
import { requireUser } from "@/lib/dal";
import { storePlatformOrder } from "@/lib/platformOrder";
import type { PlatformId } from "@/lib/data/types";

/** Saves the order the signed-in user arranged their platform cards in. Anything invalid is cleaned up, never trusted. */
export async function savePlatformOrder(order: PlatformId[]): Promise<PlatformId[]> {
  const user = await requireUser();
  return storePlatformOrder(getDb(), user.id, order);
}
