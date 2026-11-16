import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { completeConnect, STATE_COOKIE } from "@/lib/connect/flow";
import { baseUrl, sessionUserId } from "@/lib/connect/http";

/** The platform sends people back here with a code; store the connection and return them. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/connect/[platform]/callback">) {
  const { platform } = await ctx.params;
  const base = baseUrl(request);

  const userId = await sessionUserId(request);
  if (!userId) return NextResponse.redirect(new URL("/sign-in?next=/settings", base));

  const { location } = await completeConnect({
    platform,
    query: request.nextUrl.searchParams,
    cookie: request.cookies.get(STATE_COOKIE)?.value,
    userId,
    baseUrl: base,
    db: getDb(),
  });
  const res = NextResponse.redirect(new URL(location, base));
  res.cookies.set(STATE_COOKIE, "", { path: "/api/connect", maxAge: 0 });
  return res;
}
