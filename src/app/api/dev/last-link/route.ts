import { devMailbox } from "@/lib/email";

/**
 * Development only: returns the last sign-in link for an address so it can be
 * opened without an email provider. Returns 404 in production or when email is configured.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development" || process.env.RESEND_API_KEY) {
    return new Response("Not found", { status: 404 });
  }
  const email = new URL(request.url).searchParams.get("email")?.toLowerCase() ?? "";
  const entry = devMailbox().get(email);
  return Response.json(entry ? { url: entry.url } : { url: null });
}
