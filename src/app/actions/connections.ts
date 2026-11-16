"use server";

import { refresh } from "next/cache";
import { getDb } from "@/db";
import { disconnect } from "@/lib/connect/service";
import { requireUser } from "@/lib/dal";
import { PLATFORM_ORDER, type PlatformId } from "@/lib/data/types";

/** Disconnects one of the signed-in user's platforms and deletes its stored stats. */
export async function disconnectPlatform(platform: PlatformId): Promise<void> {
  const user = await requireUser();
  if (!PLATFORM_ORDER.includes(platform)) throw new Error("Unknown platform");
  await disconnect(getDb(), user.id, platform);
  refresh();
}
