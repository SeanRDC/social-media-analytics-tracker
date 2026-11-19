import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { getAvatar, MAX_AVATAR_BYTES, removeAvatar, saveAvatar, sniffImage, validateAvatar } from "@/lib/avatar";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 1]);
const TEXT = new TextEncoder().encode("<svg onload=alert(1)>");

describe("sniffImage", () => {
  it("recognises PNG, JPEG and WebP by their first bytes, not the file name", () => {
    expect(sniffImage(PNG)).toBe("image/png");
    expect(sniffImage(JPEG)).toBe("image/jpeg");
    expect(sniffImage(WEBP)).toBe("image/webp");
    expect(sniffImage(TEXT)).toBeNull();
  });
});

describe("validateAvatar", () => {
  it("accepts a small image", () => {
    expect(validateAvatar(PNG)).toEqual({ ok: true, mime: "image/png" });
  });
  it("rejects empty, oversized and non-image files", () => {
    expect(validateAvatar(new Uint8Array())).toEqual({ ok: false, error: "Choose a photo first." });
    const big = new Uint8Array(MAX_AVATAR_BYTES + 1);
    big.set(PNG);
    expect(validateAvatar(big)).toEqual({ ok: false, error: "That photo is too large. Try a smaller one." });
    expect(validateAvatar(TEXT)).toEqual({ ok: false, error: "That file isn't a JPG, PNG or WebP photo." });
  });
});

describe("saving and removing", () => {
  let db: Db;
  beforeAll(async () => {
    const pg = drizzle(new PGlite(), { schema, casing: "snake_case" });
    await migrate(pg, { migrationsFolder: "drizzle" });
    db = pg as unknown as Db;
    await db.insert(schema.user).values({ id: "u1", name: "Sam", email: "sam@example.com" });
  }, 30_000);

  const image = async () => (await db.select({ image: schema.user.image }).from(schema.user).where(eq(schema.user.id, "u1")))[0].image;

  it("stores the photo and points the account picture at it", async () => {
    await saveAvatar(db, "u1", JPEG, "image/jpeg", new Date("2026-11-18T10:00:00Z"));
    expect(await getAvatar(db, "u1")).toEqual({ mime: "image/jpeg", bytes: JPEG });
    expect(await image()).toBe(`/api/avatar?v=${new Date("2026-11-18T10:00:00Z").getTime()}`);
  });

  it("replaces an earlier photo", async () => {
    await saveAvatar(db, "u1", PNG, "image/png", new Date("2026-11-18T11:00:00Z"));
    expect(await getAvatar(db, "u1")).toEqual({ mime: "image/png", bytes: PNG });
  });

  it("removes the photo and the picture link", async () => {
    await removeAvatar(db, "u1");
    expect(await getAvatar(db, "u1")).toBeNull();
    expect(await image()).toBeNull();
  });
});
