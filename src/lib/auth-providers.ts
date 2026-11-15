export type SocialProvider = "google" | "apple";

export const googleCredentials =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } : null;
export const appleCredentials =
  process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET ? { clientId: process.env.APPLE_CLIENT_ID, clientSecret: process.env.APPLE_CLIENT_SECRET } : null;

/** Social sign-in buttons only appear for providers with credentials. Kept free of database imports. */
export const enabledProviders: SocialProvider[] = [...(googleCredentials ? ["google" as const] : []), ...(appleCredentials ? ["apple" as const] : [])];
