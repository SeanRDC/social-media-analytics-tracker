import { NextResponse, type NextRequest } from "next/server";
import { beginConnect, safeReturnTo, STATE_COOKIE, STATE_TTL_SECONDS } from "@/lib/connect/flow";
import { baseUrl, sessionUserId } from "@/lib/connect/http";

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
