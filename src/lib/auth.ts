import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { getDb, schema } from "@/db";
import { appleCredentials, googleCredentials, reviewerSignIn } from "@/lib/auth-providers";
import { APP_NAME } from "@/lib/brand";
import { sendSignInEmail } from "@/lib/email";
import { authLog } from "@/lib/safe-error";

function createAuth() {
  return betterAuth({
    appName: APP_NAME,
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    // its default logger prints failed queries with their values (the session token)
    logger: { log: authLog },
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification, rateLimit: schema.rateLimit },
    }),
    // the platform reviewers' account only; nobody can sign up with a password
    emailAndPassword: { enabled: reviewerSignIn, disableSignUp: true, minPasswordLength: 16 },
    socialProviders: {
      ...(googleCredentials ? { google: googleCredentials } : {}),
      ...(appleCredentials ? { apple: appleCredentials } : {}),
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // refresh the expiry at most daily
    },
    // stored in Postgres so limits hold across serverless instances; on in production only
    rateLimit: {
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        // each sign-in link costs an email: 5 per 10 minutes per IP address
        "/sign-in/magic-link": { window: 600, max: 5 },
        // password guessing: 5 tries per 10 minutes per IP address
        "/sign-in/email": { window: 600, max: 5 },
      },
    },
    trustedOrigins: appleCredentials ? ["https://appleid.apple.com"] : [],
    plugins: [
      magicLink({
        expiresIn: 60 * 10,
        sendMagicLink: async ({ email, url }) => sendSignInEmail(email, url),
      }),
      // lets server actions set auth cookies; keep last
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;

/**
 * Created on first use, not at import: build workers import this module in
 * parallel, and the local embedded database allows only one process to open it.
 */
export function getAuth(): Auth {
  const g = globalThis as unknown as { __auth?: Auth };
  return (g.__auth ??= createAuth());
}
