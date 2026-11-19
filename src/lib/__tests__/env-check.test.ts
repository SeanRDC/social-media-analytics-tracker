import { describe, expect, it } from "vitest";
import { checkProductionEnv } from "@/lib/env-check";

const GOOD = {
  DATABASE_URL: "postgres://x",
  BETTER_AUTH_SECRET: "s".repeat(40),
  BETTER_AUTH_URL: "https://app.example",
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
  CRON_SECRET: "c".repeat(32),
  RESEND_API_KEY: "re_x",
  EMAIL_FROM: "App <a@app.example>",
  LEGAL_CONTACT_EMAIL: "legal@app.example",
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
};

describe("checkProductionEnv", () => {
  it("passes a complete production setup", () => {
    expect(checkProductionEnv(GOOD)).toEqual({ errors: [], warnings: [] });
  });

  it("names every missing required setting", () => {
    expect(checkProductionEnv({}).errors).toEqual(expect.arrayContaining(["DATABASE_URL is not set", "TOKEN_ENCRYPTION_KEY is not set", "CRON_SECRET is not set", "RESEND_API_KEY is not set"]));
  });

  it("catches a wrong-sized key and a non-https site URL", () => {
    const { errors } = checkProductionEnv({ ...GOOD, TOKEN_ENCRYPTION_KEY: "short", BETTER_AUTH_URL: "http://app.example" });
    expect(errors).toEqual(["TOKEN_ENCRYPTION_KEY must be 32 bytes, base64 encoded", "BETTER_AUTH_URL must start with https:// in production"]);
  });

  it("warns about half-configured platforms and push", () => {
    const { warnings } = checkProductionEnv({ ...GOOD, META_APP_ID: "x", NEXT_PUBLIC_VAPID_PUBLIC_KEY: "k" });
    expect(warnings).toEqual(["Set both NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY, or neither", "Facebook and Instagram: set both META_APP_ID and META_APP_SECRET"]);
  });
});
