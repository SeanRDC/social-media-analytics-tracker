import { afterEach, describe, expect, it, vi } from "vitest";
import { connectMode, ProviderError, ReauthRequired, resolveProvider } from "@/lib/connect/providers";
import { facebookProvider } from "@/lib/connect/providers/facebook";
import { instagramProvider } from "@/lib/connect/providers/instagram";
import { linkedinProvider } from "@/lib/connect/providers/linkedin";
import { tiktokProvider } from "@/lib/connect/providers/tiktok";
import { youtubeProvider } from "@/lib/connect/providers/youtube";

const C = { clientId: "cid", clientSecret: "csecret" };
const REDIRECT = "http://localhost:3000/api/connect/x/callback";

type Reply = { status?: number; body: unknown };
/** Stubs fetch with replies in order and records each request. */
function stubFetch(...replies: Reply[]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      const r = replies.shift() ?? { status: 500, body: {} };
      return new Response(JSON.stringify(r.body), { status: r.status ?? 200 });
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const params = (url: string) => Object.fromEntries(new URL(url).searchParams);

describe("authorize URLs", () => {
  const a = { redirectUri: REDIRECT, state: "st", codeChallenge: "ch" };

  it("asks Google for offline, read-only YouTube access with PKCE", () => {
    const p = params(youtubeProvider(C).authorizeUrl(a));
    expect(p).toMatchObject({ client_id: "cid", access_type: "offline", prompt: "consent", state: "st", code_challenge: "ch", code_challenge_method: "S256" });
    expect(p.scope).toContain("youtube.readonly");
    expect(p.scope).toContain("yt-analytics.readonly");
  });

  it("uses TikTok's client_key and comma-separated scopes", () => {
    const p = params(tiktokProvider(C).authorizeUrl(a));
    expect(p.client_key).toBe("cid");
    expect(p.scope).toBe("user.info.basic,user.info.profile,user.info.stats,video.list");
  });

  it("requests Instagram business scopes on instagram.com", () => {
    const url = instagramProvider(C).authorizeUrl(a);
    expect(url.startsWith("https://www.instagram.com/oauth/authorize")).toBe(true);
    expect(params(url).scope).toBe("instagram_business_basic,instagram_business_manage_insights");
  });

  it("uses the configured Graph API version for Facebook", () => {
    vi.stubEnv("META_GRAPH_VERSION", "v27.0");
    expect(facebookProvider(C).authorizeUrl(a)).toContain("facebook.com/v27.0/dialog/oauth");
  });

  it("requests LinkedIn organization scopes", () => {
    expect(params(linkedinProvider(C).authorizeUrl(a)).scope).toBe("r_organization_social rw_organization_admin");
  });
});

describe("YouTube", () => {
  it("exchanges a code and finds the channel", async () => {
    const calls = stubFetch(
      { body: { access_token: "at", refresh_token: "rt", expires_in: 3599, scope: "s" } },
      { body: { items: [{ id: "UC1", snippet: { title: "Northbay" } }] } },
    );
    const p = youtubeProvider(C);
    const t = await p.exchangeCode({ code: "c", redirectUri: REDIRECT, codeVerifier: "v" });
    expect(t).toMatchObject({ accessToken: "at", refreshToken: "rt", scopes: "s" });
    expect(t.expiresAt!.getTime()).toBeGreaterThan(Date.now() + 3500_000);
    expect(String(calls[0].init?.body)).toContain("code_verifier=v");
    expect(await p.fetchAccount(t)).toEqual({ ok: true, externalId: "UC1", name: "Northbay" });
    expect((calls[1].init?.headers as Record<string, string>).Authorization).toBe("Bearer at");
  });

  it("reports a Google account without a channel", async () => {
    stubFetch({ body: { items: [] } });
    expect(await youtubeProvider(C).fetchAccount({ accessToken: "at", refreshToken: null, expiresAt: null, scopes: null })).toEqual({ ok: false, reason: "no-account" });
  });

  it("keeps the old refresh token when Google does not send a new one", async () => {
    stubFetch({ body: { access_token: "at2", expires_in: 3599 } });
    const t = await youtubeProvider(C).refresh!({ accessToken: "at", refreshToken: "rt" });
    expect(t).toMatchObject({ accessToken: "at2", refreshToken: "rt" });
  });

  it("asks to reconnect when the refresh token was revoked", async () => {
    stubFetch({ status: 400, body: { error: "invalid_grant" } });
    await expect(youtubeProvider(C).refresh!({ accessToken: "at", refreshToken: "rt" })).rejects.toBeInstanceOf(ReauthRequired);
  });

  it("reports other failures without asking to reconnect", async () => {
    stubFetch({ status: 503, body: {} });
    await expect(youtubeProvider(C).refresh!({ accessToken: "at", refreshToken: "rt" })).rejects.toBeInstanceOf(ProviderError);
  });
});

describe("Instagram", () => {
  it("swaps the short-lived token for a 60-day one", async () => {
    const calls = stubFetch(
      { body: { access_token: "short", user_id: 17841, permissions: ["instagram_business_basic"] } },
      { body: { access_token: "long", token_type: "bearer", expires_in: 5184000 } },
    );
    const t = await instagramProvider(C).exchangeCode({ code: "c", redirectUri: REDIRECT, codeVerifier: "" });
    expect(t).toMatchObject({ accessToken: "long", refreshToken: null, scopes: "instagram_business_basic" });
    expect(params(calls[1].url)).toMatchObject({ grant_type: "ig_exchange_token", access_token: "short", client_secret: "csecret" });
  });

  it("needs a Professional account", async () => {
    stubFetch({ body: { user_id: "1", username: "me", account_type: "PERSONAL" } });
    expect(await instagramProvider(C).fetchAccount({ accessToken: "t", refreshToken: null, expiresAt: null, scopes: null })).toEqual({
      ok: false,
      reason: "needs-professional",
    });
  });

  it("connects a Creator account by its handle", async () => {
    stubFetch({ body: { user_id: "1784", username: "northbay", account_type: "MEDIA_CREATOR" } });
    expect(await instagramProvider(C).fetchAccount({ accessToken: "t", refreshToken: null, expiresAt: null, scopes: null })).toEqual({
      ok: true,
      externalId: "1784",
      name: "@northbay",
    });
  });
});

describe("Facebook", () => {
  it("stores the Page token instead of the user token", async () => {
    stubFetch({ body: { data: [{ id: "p1", name: "Northbay", access_token: "page-token" }] } });
    const r = await facebookProvider(C).fetchAccount({ accessToken: "user", refreshToken: null, expiresAt: new Date(), scopes: "x" });
    expect(r).toMatchObject({ ok: true, externalId: "p1", name: "Northbay", tokens: { accessToken: "page-token", expiresAt: null } });
  });

  it("asks to reconnect on Meta's invalid-token error", async () => {
    stubFetch({ status: 400, body: { error: { message: "Error validating access token", type: "OAuthException", code: 190 } } });
    await expect(facebookProvider(C).fetchAccount({ accessToken: "user", refreshToken: null, expiresAt: null, scopes: null })).rejects.toBeInstanceOf(ReauthRequired);
  });
});

describe("TikTok", () => {
  it("treats error code ok as success", async () => {
    stubFetch({ body: { data: { user: { open_id: "o1", display_name: "Northbay", username: "northbay" } }, error: { code: "ok", message: "" } } });
    expect(await tiktokProvider(C).fetchAccount({ accessToken: "t", refreshToken: null, expiresAt: null, scopes: null })).toEqual({
      ok: true,
      externalId: "o1",
      name: "@northbay",
    });
  });
});

describe("LinkedIn", () => {
  it("finds the first administered Page and sends the version header", async () => {
    vi.stubEnv("LINKEDIN_API_VERSION", "202609");
    const calls = stubFetch({ body: { elements: [{ organization: "urn:li:organization:42" }] } }, { body: { localizedName: "Northbay Studio" } });
    const r = await linkedinProvider(C).fetchAccount({ accessToken: "t", refreshToken: null, expiresAt: null, scopes: null });
    expect(r).toEqual({ ok: true, externalId: "42", name: "Northbay Studio" });
    expect((calls[0].init?.headers as Record<string, string>)["LinkedIn-Version"]).toBe("202609");
  });

  it("asks to reconnect when there is no refresh token", async () => {
    await expect(linkedinProvider(C).refresh!({ accessToken: "t", refreshToken: null })).rejects.toBeInstanceOf(ReauthRequired);
  });
});

describe("resolveProvider", () => {
  it("uses the real provider when credentials are set", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    expect(resolveProvider("youtube")?.mode).toBe("live");
  });

  it("simulates outside production without credentials", () => {
    vi.stubEnv("TIKTOK_CLIENT_KEY", "");
    expect(resolveProvider("tiktok")?.mode).toBe("simulated");
  });

  it("is unavailable in production without credentials", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TIKTOK_CLIENT_KEY", "");
    expect(connectMode("tiktok")).toBe("unavailable");
  });

  it("can turn simulation off", () => {
    vi.stubEnv("CONNECT_SIMULATION", "off");
    vi.stubEnv("TIKTOK_CLIENT_KEY", "");
    expect(connectMode("tiktok")).toBe("unavailable");
  });

  it("never offers X or unknown platforms", () => {
    expect(resolveProvider("x")).toBeNull();
    expect(resolveProvider("myspace")).toBeNull();
  });
});
