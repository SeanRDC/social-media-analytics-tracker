import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db";
import { getAuth } from "@/lib/auth";
import { hasAcceptedTerms } from "@/lib/consent";

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

/**
 * The signed-in user, or a redirect to sign-in, without the terms check. Only for
 * the agreement screen itself and for leaving (account deletion).
 */
export async function requireSignedInUser(): Promise<CurrentUser> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const { id, name, email, image } = session.user;
  // magic-link sign-ups start without a name; fall back to the email's local part
  return { id, name: name || email.split("@")[0], email, image: image ?? null };
}

/** Whether the user agreed to the current terms; once per request. */
export const hasAgreed = cache((userId: string) => hasAcceptedTerms(getDb(), userId));

/**
 * The signed-in user who has agreed to the current Terms and Privacy Policy;
 * otherwise a redirect to sign-in or to /welcome. Returns only what the UI needs.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await requireSignedInUser();
  if (!(await hasAgreed(user.id))) redirect("/welcome");
  return user;
}
