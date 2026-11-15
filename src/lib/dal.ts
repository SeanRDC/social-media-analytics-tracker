import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAuth } from "@/lib/auth";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

/**
 * Data Access Layer: the one place that reads the session.
 * Reads request headers, so callers must sit inside a <Suspense> boundary.
 */
export const getSession = cache(async () => {
  // read the request first so prerendering stops here, before any database work
  const h = await headers();
  return getAuth().api.getSession({ headers: h });
});

/** The signed-in user, or a redirect to sign-in. Returns only what the UI needs. */
export async function requireUser(): Promise<CurrentUser> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const { id, name, email, image } = session.user;
  // magic-link sign-ups start without a name; fall back to the email's local part
  return { id, name: name || email.split("@")[0], email, image: image ?? null };
}
