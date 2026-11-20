"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { CHOOSE_PATH, finishChoice, PICK_COOKIE } from "@/lib/connect/flow";
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

/** Connects the Page the person picked on the choose screen, then returns them to where they started. */
export async function chooseAccount(form: FormData): Promise<void> {
  const user = await requireUser();
  const jar = await cookies();
  const { location } = await finishChoice({ cookie: jar.get(PICK_COOKIE)?.value, userId: user.id, externalId: String(form.get("externalId") ?? ""), db: getDb() });
  jar.set(PICK_COOKIE, "", { path: CHOOSE_PATH, maxAge: 0 });
  redirect(location);
}
