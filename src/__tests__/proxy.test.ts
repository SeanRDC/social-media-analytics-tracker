import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

const req = (path: string, cookie?: string) => new NextRequest(new URL(path, "http://localhost:3000"), { headers: cookie ? { cookie } : {} });

describe("proxy", () => {
  it("sends visitors without a session to sign-in and remembers where they were going", () => {
    const res = proxy(req("/platforms/youtube?x=1"));
    expect(res.status).toBe(307);
    const to = new URL(res.headers.get("location")!);
    expect(to.pathname).toBe("/sign-in");
    expect(to.searchParams.get("next")).toBe("/platforms/youtube?x=1");
  });

  it("lets visitors with a session cookie through", () => {
    const res = proxy(req("/overview", "better-auth.session_token=abc.def"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("recognises the secure cookie name used over HTTPS", () => {
    const res = proxy(new NextRequest(new URL("https://example.com/overview"), { headers: { cookie: "__Secure-better-auth.session_token=abc.def" } }));
    expect(res.headers.get("location")).toBeNull();
  });
});
