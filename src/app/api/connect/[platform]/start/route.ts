import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { hit, LIMITS } from "@/lib/rate-limit";
import { beginConnect, safeReturnTo, STATE_COOKIE, STATE_TTL_SECONDS } from "@/lib/connect/flow";
import { baseUrl, sessionUserId } from "@/lib/connect/http";
import { hasAcceptedTerms } from "@/lib/consent";

/** Sends the signed-in person to the platform's approval screen. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/connect/[platform]/start">) {
  const { platform } = await ctx.params;
  const returnTo = request.nextUrl.searchParams.get("returnTo");
  const base = baseUrl(request);

  const userId = await sessionUserId(request);
  if (!userId) {
    const signIn = new URL("/sign-in", base);
    signIn.searchParams.set("next", safeReturnTo(returnTo));
    return NextResponse.redirect(signIn);
  }

  // no platform access before agreeing to the Terms and Privacy Policy
  if (!(await hasAcceptedTerms(getDb(), userId))) return NextResponse.redirect(new URL("/welcome", base));

  if (!(await hit(getDb(), `connect:${userId}`, LIMITS.connect)).ok) {
    const back = new URL(safeReturnTo(returnTo), base);
    back.search = new URLSearchParams({ connect: "error", platform, reason: "busy" }).toString();
    return NextResponse.redirect(back);
  }

  const { location, cookie } = beginConnect({ platform, userId, returnTo, baseUrl: base });
  const res = NextResponse.redirect(new URL(location, base));
  if (cookie) {
    res.cookies.set(STATE_COOKIE, cookie, {
      httpOnly: true,
      // lax: the platform's redirect back is a top-level GET, which still carries it
      sameSite: "lax",
      secure: base.startsWith("https://"),
      path: "/api/connect",
      maxAge: STATE_TTL_SECONDS,
    });
  }
  return res;
}
