/**
 * Production settings check, run once at server start (src/instrumentation.ts).
 * Problems are logged loudly rather than crashing, so a missing optional
 * service doesn't take the whole site down.
 */
type Env = Record<string, string | undefined>;

const REQUIRED = ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "TOKEN_ENCRYPTION_KEY", "CRON_SECRET", "RESEND_API_KEY", "EMAIL_FROM"] as const;

export function checkProductionEnv(env: Env): { errors: string[]; warnings: string[] } {
  const errors: string[] = REQUIRED.filter((k) => !env[k]).map((k) => `${k} is not set`);
  const warnings: string[] = [];

  if (env.TOKEN_ENCRYPTION_KEY && Buffer.from(env.TOKEN_ENCRYPTION_KEY, "base64").length !== 32) errors.push("TOKEN_ENCRYPTION_KEY must be 32 bytes, base64 encoded");
  if (env.BETTER_AUTH_URL && !env.BETTER_AUTH_URL.startsWith("https://")) errors.push("BETTER_AUTH_URL must start with https:// in production");
  if (env.BETTER_AUTH_SECRET && env.BETTER_AUTH_SECRET.length < 32) errors.push("BETTER_AUTH_SECRET should be at least 32 characters");
  if (env.CRON_SECRET && env.CRON_SECRET.length < 16) warnings.push("CRON_SECRET is short; use at least 16 random characters");

  if (!env.LEGAL_CONTACT_EMAIL) warnings.push("LEGAL_CONTACT_EMAIL is not set (shown on the privacy, terms and data deletion pages)");
  if (Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) !== Boolean(env.VAPID_PRIVATE_KEY)) warnings.push("Set both NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY, or neither");
  const platforms: [string, string, string][] = [
    ["YouTube", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    ["Facebook", "META_APP_ID", "META_APP_SECRET"],
    ["Instagram", "INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET"],
    ["TikTok", "TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
    ["LinkedIn", "LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
  ];
  const configured = platforms.filter(([, id, secret]) => env[id] && env[secret]);
  if (!configured.length) warnings.push("No platform credentials are set, so nobody can connect an account");
  for (const [name, id, secret] of platforms) if (Boolean(env[id]) !== Boolean(env[secret])) warnings.push(`${name}: set both ${id} and ${secret}`);
  return { errors, warnings };
}
