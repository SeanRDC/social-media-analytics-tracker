import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderError, RateLimited, ReauthRequired } from "@/lib/connect/providers";
import { getJson, postForm } from "@/lib/connect/providers/oauth";

afterEach(() => vi.unstubAllGlobals());

/** Replies in order; the last one repeats. */
function replies(...rs: (Response | Error)[]) {
  const f = vi.fn(async () => {
    const r = rs.length > 1 ? rs.shift()! : rs[0];
    if (r instanceof Error) throw r;
    return r.clone();
  });
  vi.stubGlobal("fetch", f);
  return f;
}

describe("platform requests", () => {
  it("keeps Google's reason for a refusal so the log says what to fix", async () => {
    replies(
      Response.json(
        { error: { code: 403, message: "YouTube Analytics API has not been used in project 123 before or it is disabled.", errors: [{ reason: "accessNotConfigured" }] } },
        { status: 403 },
      ),
    );
    const err = await getJson("https://api.example/x", "YouTube Analytics").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect((err as Error).message).toBe("YouTube Analytics failed (403, accessNotConfigured): YouTube Analytics API has not been used in project 123 before or it is disabled.");
  });

  it("retries a server error and succeeds", async () => {
    const f = replies(new Response("", { status: 503 }), Response.json({ ok: 1 }));
    expect(await getJson("https://api.example/x", "Thing")).toEqual({ ok: 1 });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("retries network failures, then reports them", async () => {
    const f = replies(new TypeError("fetch failed"));
    await expect(getJson("https://api.example/x", "Thing")).rejects.toMatchObject({ code: "network" });
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("re-sends the body of a form on retry", async () => {
    const bodies: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: RequestInit) => {
        bodies.push(String(init.body));
        return bodies.length === 1 ? new Response("", { status: 502 }) : Response.json({ access_token: "a" });
      }),
    );
    await postForm("https://api.example/token", { code: "c" }, "Token");
    expect(bodies).toEqual(["code=c", "code=c"]);
  });

  it("gives up at once when the platform asks for a long wait", async () => {
    const f = replies(new Response("", { status: 429, headers: { "Retry-After": "3600" } }));
    await expect(getJson("https://api.example/x", "Thing")).rejects.toBeInstanceOf(RateLimited);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["Meta throttling", 400, { error: { code: 4, message: "Application request limit reached" } }],
    ["Meta Page throttling", 400, { error: { code: 32, message: "Page request limit reached" } }],
    ["YouTube quota", 403, { error: { code: 403, errors: [{ reason: "quotaExceeded" }] } }],
    ["TikTok", 200, { error: { code: "rate_limit_exceeded", message: "" } }],
  ])("treats %s as rate limited, not broken", async (_name, status, body) => {
    replies(Response.json(body, { status }));
    const e = await getJson("https://api.example/x", "Thing").catch((x) => x);
    expect(e).toBeInstanceOf(RateLimited);
    expect(e).toBeInstanceOf(ProviderError);
    expect(e).not.toBeInstanceOf(ReauthRequired);
  });

  it("does not retry client errors", async () => {
    const f = replies(Response.json({ error: { code: 100, message: "bad" } }, { status: 400 }));
    await expect(getJson("https://api.example/x", "Thing")).rejects.toBeInstanceOf(ProviderError);
    expect(f).toHaveBeenCalledTimes(1);
  });
});
