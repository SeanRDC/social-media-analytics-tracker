/**
 * AES-256-GCM encryption for platform tokens and short-lived sealed values
 * (the OAuth state cookie). Output: `v1.<iv>.<tag>.<ciphertext>`, base64url.
 *
 * Key: TOKEN_ENCRYPTION_KEY (32 random bytes, base64). Outside production a key
 * is derived from BETTER_AUTH_SECRET so local development needs no setup.
 * Changing the key makes stored tokens unreadable, so people would need to reconnect.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (raw) {
    const k = Buffer.from(raw, "base64");
    if (k.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes, base64 encoded (openssl rand -base64 32).");
    return k;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("TOKEN_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32");
  }
  return createHash("sha256")
    .update(`development-only:${process.env.BETTER_AUTH_SECRET ?? ""}`)
    .digest();
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decrypt(sealed: string): string {
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || data === undefined) throw new Error("Unrecognised encrypted value");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

/** Encrypts a JSON value that stops being readable after `ttlSeconds`. */
export function seal(value: unknown, ttlSeconds: number): string {
  return encrypt(JSON.stringify({ v: value, e: Date.now() + ttlSeconds * 1000 }));
}

/** The sealed value, or null when it was tampered with, is malformed or has expired. */
export function unseal<T>(sealed: string): T | null {
  try {
    const { v, e } = JSON.parse(decrypt(sealed)) as { v: T; e: number };
    return Date.now() <= e ? v : null;
  } catch {
    return null;
  }
}
