"use server";

import { getDb } from "@/db";
import { removeAvatar, saveAvatar, validateAvatar } from "@/lib/avatar";
import { requireUser } from "@/lib/dal";

/** Saves the signed-in person's new profile photo (already resized in the browser). */
export async function uploadAvatar(form: FormData): Promise<{ error: string } | void> {
  const user = await requireUser();
  const file = form.get("photo");
  if (!(file instanceof Blob)) return { error: "Choose a photo first." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = validateAvatar(bytes);
  if (!check.ok) return { error: check.error };
  await saveAvatar(getDb(), user.id, bytes, check.mime);
}

export async function deleteAvatar(): Promise<{ error: string } | void> {
  const user = await requireUser();
  await removeAvatar(getDb(), user.id);
}
