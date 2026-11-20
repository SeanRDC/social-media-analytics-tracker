"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { deleteAccountData } from "@/lib/account";
import { getAuth } from "@/lib/auth";
import { requireSignedInUser } from "@/lib/dal";
import { logEvent } from "@/lib/log";

/**
 * Deletes the signed-in account after the person types their email to confirm.
 * Signs out first (clearing the cookie), then removes everything.
 */
export async function deleteAccount(confirmEmail: string): Promise<{ error: string } | void> {
  const user = await requireSignedInUser();
  if (String(confirmEmail).trim().toLowerCase() !== user.email.toLowerCase()) {
    return { error: "That doesn't match the email you sign in with." };
  }
  await getAuth().api.signOut({ headers: await headers() });
  await deleteAccountData(getDb(), user.id);
  logEvent("info", "account_deleted", { userId: user.id });
  redirect("/sign-in?deleted=1");
}

const NAME_MAX = 60;

/** Renames the signed-in person. Names are trimmed, single-spaced and 1–60 characters. */
export async function updateName(name: string): Promise<{ error: string } | void> {
  await requireSignedInUser();
  const clean = String(name).replace(/\s+/g, " ").trim();
  if (!clean) return { error: "Enter a name." };
  if (clean.length > NAME_MAX) return { error: `Keep it under ${NAME_MAX} characters.` };
  await getAuth().api.updateUser({ body: { name: clean }, headers: await headers() });
}
