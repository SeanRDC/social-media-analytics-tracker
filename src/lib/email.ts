import { APP_NAME, LEGAL_CONTACT } from "@/lib/brand";
import { renderSignInEmail } from "@/lib/emails/sign-in";

export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Sends an email through Resend when RESEND_API_KEY is set. Without it
 * (local development) the email is printed to the server log instead; in
 * production that is an error.
 */
export async function sendEmail(email: Email): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      console.error("RESEND_API_KEY is not set; emails cannot be sent.");
      throw new Error("Email isn't set up yet.");
    }
    console.info(`
  ✉  To ${email.to}: ${email.subject}
${email.text.replace(/^/gm, "     ")}
`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? `${APP_NAME} <onboarding@resend.dev>`, ...email }),
  });
  if (!res.ok) throw new Error(`Couldn't send the email (${res.status}).`);
}

/**
 * The sign-in email. Locally the link is also kept in a dev-only mailbox so the
 * "check your email" screen can show it.
 */
export async function sendSignInEmail(to: string, url: string): Promise<void> {
  if (!process.env.RESEND_API_KEY && process.env.NODE_ENV !== "production") devMailbox().set(to.toLowerCase(), { url, at: Date.now() });
  await sendEmail({ to, ...renderSignInEmail(url, LEGAL_CONTACT) });
}

type Mailbox = Map<string, { url: string; at: number }>;

/** Development only: the last sign-in link per address. */
export function devMailbox(): Mailbox {
  const g = globalThis as unknown as { __devMailbox?: Mailbox };
  return (g.__devMailbox ??= new Map());
}
