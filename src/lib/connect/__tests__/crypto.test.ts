import { afterEach, describe, expect, it, vi } from "vitest";
import { decrypt, encrypt, seal, unseal } from "@/lib/connect/crypto";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("token encryption", () => {
  it("round-trips a token", () => {
    const sealed = encrypt("ya29.secret-token");
    expect(sealed).not.toContain("secret");
    expect(decrypt(sealed)).toBe("ya29.secret-token");
  });

  it("uses a fresh IV every time", () => {
    expect(encrypt("same")).not.toBe(encrypt("same"));
  });

  it("rejects tampered data", () => {
    const [v, iv, tag, data] = encrypt("hello").split(".");
    const flipped = data.slice(0, -2) + (data.at(-2) === "A" ? "B" : "A") + data.at(-1);
    expect(() => decrypt([v, iv, tag, flipped].join("."))).toThrow();
  });

  it("uses TOKEN_ENCRYPTION_KEY when set", () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
    const sealed = encrypt("a");
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 8).toString("base64"));
    expect(() => decrypt(sealed)).toThrow();
  });

  it("refuses to run in production without a key", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", "");
    expect(() => encrypt("a")).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });

  it("rejects a key that is not 32 bytes", () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", Buffer.alloc(16).toString("base64"));
    expect(() => encrypt("a")).toThrow(/32 bytes/);
  });
});

describe("sealed values", () => {
  it("returns the value before it expires", () => {
    expect(unseal<{ a: number }>(seal({ a: 1 }, 60))).toEqual({ a: 1 });
  });

  it("returns null once expired", () => {
    vi.useFakeTimers();
    const sealed = seal({ a: 1 }, 60);
    vi.advanceTimersByTime(61_000);
    expect(unseal(sealed)).toBeNull();
  });

  it("returns null for garbage", () => {
    expect(unseal("nope")).toBeNull();
    expect(unseal("")).toBeNull();
  });
});
