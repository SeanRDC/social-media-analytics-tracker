"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { connection } from "@/db/schema";
import { acceptTerms } from "@/lib/consent";
import { requireSignedInUser } from "@/lib/dal";
import { logEvent } from "@/lib/log";

/**
 * Records agreement to the current Terms and Privacy Policy, then continues:
 * to connecting platforms for a new account, otherwise to the dashboard.
 */
export async function agreeToTerms(_prev: { error: string } | null, form: FormData): Promise<{ error: string } | null> {
  const user = await requireSignedInUser();
  if (form.get("agree") !== "on") return { error: "Tick the box to agree before continuing." };
  const db = getDb();
  await acceptTerms(db, user.id);
  logEvent("info", "terms_accepted", { userId: user.id });
  const [any] = await db.select({ id: connection.id }).from(connection).where(eq(connection.userId, user.id)).limit(1);
  redirect(any ? "/overview" : "/onboarding/connect");
}
