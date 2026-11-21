import { DrizzleQueryError } from "drizzle-orm/errors";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authLog, describeError } from "@/lib/safe-error";

const TOKEN = "1fL6jHEqCGmy2tGxGKL1Xf4dfPA6gkhO";

/** The shape Better Auth logged on Vercel: a failed session lookup carrying the session token. */
function sessionLookupFailure() {
  const cause = Object.assign(new Error("write CONNECT_TIMEOUT ep-x-pooler.neon.tech:5432"), { code: "CONNECT_TIMEOUT" });
  return new DrizzleQueryError(`select "id", "token" from "session" where "session"."token" = $1`, [TOKEN], cause);
}

afterEach(() => vi.restoreAllMocks());

describe("describeError", () => {
  it("keeps the cause of a failed query but never its parameter values", () => {
    const text = describeError(sessionLookupFailure());
    expect(text).not.toContain(TOKEN);
    expect(text).toContain("CONNECT_TIMEOUT");
    expect(text).toContain(`from "session"`);
  });

  it("keeps the cause when the query is long, shortening the query instead", () => {
    const rows = Array.from({ length: 200 }, (_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(", ");
    const cause = Object.assign(new Error("ON CONFLICT DO UPDATE command cannot affect row a second time"), { code: "21000" });
    const text = describeError(new DrizzleQueryError(`insert into "post" ("id", "title") values ${rows}`, [TOKEN], cause));
    expect(text.length).toBeLessThanOrEqual(300);
    expect(text).toContain(`insert into "post"`);
    expect(text).toContain("cannot affect row a second time");
    expect(text).toContain("21000");
    expect(text).not.toContain(TOKEN);
  });

  it("redacts parameter lists that appear inside any error message", () => {
    const e = new Error(`Failed query: select 1 where token = $1\nparams: ${TOKEN}`);
    expect(describeError(e)).not.toContain(TOKEN);
  });

  it("describes plain errors and non-errors", () => {
    expect(describeError(new TypeError("boom"))).toBe("TypeError: boom");
    expect(describeError("text")).toBe("text");
    expect(describeError(undefined)).toBe("undefined");
  });

  it("caps the length", () => {
    expect(describeError(new Error("x".repeat(2000))).length).toBeLessThanOrEqual(300);
  });
});

describe("authLog", () => {
  it("writes Better Auth errors as one JSON line with no session token", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    authLog("error", "INTERNAL_SERVER_ERROR", sessionLookupFailure());
    const line = String(spy.mock.calls[0][0]);
    expect(line).not.toContain(TOKEN);
    expect(JSON.parse(line)).toMatchObject({ level: "error", event: "auth", message: "INTERNAL_SERVER_ERROR" });
    expect(JSON.parse(line).detail).toContain("CONNECT_TIMEOUT");
  });

  it("drops debug messages", () => {
    const spies = [vi.spyOn(console, "error"), vi.spyOn(console, "warn"), vi.spyOn(console, "info")].map((s) => s.mockImplementation(() => {}));
    authLog("debug", "noise");
    expect(spies.every((s) => s.mock.calls.length === 0)).toBe(true);
  });
});
