import "server-only";
import { getAuth } from "@/lib/auth";

/** The public site URL used in OAuth redirect URIs (must match each platform's settings). */
export function baseUrl(request: Request): string {
  return (process.env.BETTER_AUTH_URL || new URL(request.url).origin).replace(/\/$/, "");
}

/** The signed-in user's id, validated against the database (route handlers have no DAL boundary). */
export async function sessionUserId(request: Request): Promise<string | null> {
  const session = await getAuth().api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}
