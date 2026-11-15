import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate: no session cookie → sign-in, remembering the destination.
 * The real check happens in the Data Access Layer (src/lib/dal.ts).
 * Signed-in visitors are not bounced away from /sign-in here, because a stale
 * cookie would otherwise loop between the two pages.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  const to = new URL("/sign-in", request.url);
  to.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(to);
}

export const config = {
  matcher: ["/overview/:path*", "/platforms/:path*", "/content/:path*", "/audience/:path*", "/reports/:path*", "/settings/:path*", "/onboarding/:path*"],
};
