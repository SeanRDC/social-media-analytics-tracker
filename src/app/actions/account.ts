"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { deleteAccountData } from "@/lib/account";
import { getAuth } from "@/lib/auth";
import { requireUser } from "@/lib/dal";
import { logEvent } from "@/lib/log";

/**
 * Deletes the signed-in account after the person types their email to confirm.
 * Signs out first (clearing the cookie), then removes everything.
 */
export async function deleteAccount(confirmEmail: string): Promise<{ error: string } | void> {
  const user = await requireUser();
  if (String(confirmEmail).trim().toLowerCase() !== user.email.toLowerCase()) {
    return { error: "That doesn't match the email you sign in with." };
  }
  await getAuth().api.signOut({ headers: await headers() });
  await deleteAccountData(getDb(), user.id);
  logEvent("info", "account_deleted", { userId: user.id });
  redirect("/sign-in?deleted=1");
}
