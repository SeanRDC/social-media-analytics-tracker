/**
 * Agreement to the Terms of Service and Privacy Policy. New accounts (and
 * everyone, after TERMS_VERSION changes) agree once on /welcome before using the app.
 */
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { termsAcceptance } from "@/db/schema";
import { TERMS_VERSION } from "./brand";

export async function hasAcceptedTerms(db: Db, userId: string): Promise<boolean> {
  const [row] = await db.select({ version: termsAcceptance.version }).from(termsAcceptance).where(eq(termsAcceptance.userId, userId));
  return row?.version === TERMS_VERSION;
}

export async function acceptTerms(db: Db, userId: string): Promise<void> {
  const values = { version: TERMS_VERSION, acceptedAt: new Date() };
  await db.insert(termsAcceptance).values({ userId, ...values }).onConflictDoUpdate({ target: termsAcceptance.userId, set: values });
}
