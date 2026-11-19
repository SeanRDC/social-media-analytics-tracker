import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { user, userAvatar } from "@/db/schema";

/** Upload limit for the already-resized photo. */
export const MAX_AVATAR_BYTES = 200_000;

export type AvatarMime = "image/png" | "image/jpeg" | "image/webp";

/** Identifies an image by its first bytes, so a renamed file can't pass as a photo. */
export function sniffImage(b: Uint8Array): AvatarMime | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

export function validateAvatar(b: Uint8Array): { ok: true; mime: AvatarMime } | { ok: false; error: string } {
  if (!b.length) return { ok: false, error: "Choose a photo first." };
  if (b.length > MAX_AVATAR_BYTES) return { ok: false, error: "That photo is too large. Try a smaller one." };
  const mime = sniffImage(b);
  return mime ? { ok: true, mime } : { ok: false, error: "That file isn't a JPG, PNG or WebP photo." };
}

/** Stores (or replaces) the photo and points the account picture at it; `?v=` busts browser caches. */
export async function saveAvatar(db: Db, userId: string, bytes: Uint8Array, mime: AvatarMime, now = new Date()): Promise<void> {
  const data = Buffer.from(bytes).toString("base64");
  await db
    .insert(userAvatar)
    .values({ userId, mime, data, updatedAt: now })
    .onConflictDoUpdate({ target: userAvatar.userId, set: { mime, data, updatedAt: now } });
  await db.update(user).set({ image: `/api/avatar?v=${now.getTime()}` }).where(eq(user.id, userId));
}

export async function removeAvatar(db: Db, userId: string): Promise<void> {
  await db.delete(userAvatar).where(eq(userAvatar.userId, userId));
  await db.update(user).set({ image: null }).where(eq(user.id, userId));
}

export async function getAvatar(db: Db, userId: string): Promise<{ mime: string; bytes: Uint8Array } | null> {
  const [row] = await db.select().from(userAvatar).where(eq(userAvatar.userId, userId));
  return row ? { mime: row.mime, bytes: new Uint8Array(Buffer.from(row.data, "base64")) } : null;
}
