export type SocialProvider = "google" | "apple";

export const googleCredentials =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } : null;
export const appleCredentials =
  process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET ? { clientId: process.env.APPLE_CLIENT_ID, clientSecret: process.env.APPLE_CLIENT_SECRET } : null;

/**
 * Password sign-in exists only for the app-review account that platform
 * reviewers use (they can't receive our sign-in emails). It is on when
 * REVIEWER_EMAIL is set; sign-up stays closed, so the only password account is
 * the one scripts/create-reviewer.mjs creates.
 */
export const reviewerSignIn = Boolean(process.env.REVIEWER_EMAIL);

/** Social sign-in buttons only appear for providers with credentials. Kept free of database imports. */
export const enabledProviders: SocialProvider[] = [...(googleCredentials ? ["google" as const] : []), ...(appleCredentials ? ["apple" as const] : [])];
