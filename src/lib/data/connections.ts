import "server-only";
import { getDb } from "@/db";
import { listConnections } from "@/lib/connect/service";
import { requireUser } from "@/lib/dal";
import type { ConnectionView } from "./types";

/** The signed-in user's platforms and their status. Reads the session: call inside Suspense. */
export async function getMyConnections(): Promise<ConnectionView[]> {
  const user = await requireUser();
  return listConnections(getDb(), user.id);
}
