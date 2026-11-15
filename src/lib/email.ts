import { APP_NAME } from "@/lib/brand";

/**
 * Sends the sign-in email through Resend when RESEND_API_KEY is set.
 * Without it (local development), the link is printed to the server log and kept
 * in a dev-only mailbox so the "check your email" screen can show it.
 */
export async function sendSignInEmail(to: string, url: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      console.error("RESEND_API_KEY is not set; sign-in emails cannot be sent.");
      throw new Error("Email sign-in isn't set up yet.");
    }
    console.info(`\n  ✉  Sign-in link for ${to}:\n     ${url}\n`);
    devMailbox().set(to.toLowerCase(), { url, at: Date.now() });
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? `${APP_NAME} <onboarding@resend.dev>`,
      to,
      subject: `Your ${APP_NAME} sign-in link`,
      text: `Sign in to ${APP_NAME}: ${url}\n\nThe link works once and expires in 10 minutes. If you didn't ask for it, you can ignore this email.`,
      html: `<p>Sign in to <strong>${APP_NAME}</strong>:</p><p><a href="${url}">Sign in</a></p><p style="color:#666">The link works once and expires in 10 minutes. If you didn't ask for it, you can ignore this email.</p>`,
    }),
  });
  if (!res.ok) throw new Error(`Couldn't send the sign-in email (${res.status}).`);
}

type Mailbox = Map<string, { url: string; at: number }>;

/** Development only: the last sign-in link per address. */
export function devMailbox(): Mailbox {
  const g = globalThis as unknown as { __devMailbox?: Mailbox };
  return (g.__devMailbox ??= new Map());
}
