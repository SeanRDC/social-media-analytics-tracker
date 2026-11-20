/**
 * TikTok Login Kit (web). Access tokens last about 24 hours, refresh tokens
 * about a year. People can decline individual scopes, so the granted list is
 * stored as returned.
 */
import { TIKTOK_SCOPES } from "../scopes";
import { expiresIn, getJson, postForm, str, withQuery } from "./oauth";
import { ReauthRequired, type Provider, type TokenSet } from "./types";

export function tiktokCredentials() {
  const clientId = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

const tokens = (body: Record<string, unknown>): TokenSet => ({
  accessToken: str(body.access_token) ?? "",
  refreshToken: str(body.refresh_token),
  expiresAt: expiresIn(body.expires_in),
  scopes: str(body.scope),
});

export function tiktokProvider(c: { clientId: string; clientSecret: string }): Provider {
  return {
    platform: "tiktok",
    // TikTok now refuses web logins without PKCE, and expects a hex challenge
    pkce: true,
    pkceEncoding: "hex",
    refreshWindowSeconds: 30 * 60,
    authorizeUrl: ({ redirectUri, state, codeChallenge }) =>
      withQuery("https://www.tiktok.com/v2/auth/authorize/", {
        client_key: c.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: TIKTOK_SCOPES.join(","),
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      }),
    async exchangeCode({ code, redirectUri, codeVerifier }) {
      return tokens(
        await postForm(
          TOKEN_URL,
          { client_key: c.clientId, client_secret: c.clientSecret, code, code_verifier: codeVerifier, grant_type: "authorization_code", redirect_uri: redirectUri },
          "TikTok token exchange",
        ),
      );
    },
    async fetchAccount({ accessToken }) {
      const body = await getJson("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username", "TikTok account lookup", {
        Authorization: `Bearer ${accessToken}`,
      });
      const u = (body.data as { user?: { open_id?: string; display_name?: string; username?: string } } | undefined)?.user;
      if (!u?.open_id) return { ok: false, reason: "no-account" };
      return { ok: true, externalId: u.open_id, name: u.username ? `@${u.username}` : u.display_name || "TikTok account" };
    },
    async refresh({ refreshToken }) {
      if (!refreshToken) throw new ReauthRequired("No refresh token");
      return tokens(
        await postForm(TOKEN_URL, { client_key: c.clientId, client_secret: c.clientSecret, grant_type: "refresh_token", refresh_token: refreshToken }, "TikTok token refresh"),
      );
    },
    async revoke({ accessToken }) {
      await postForm("https://open.tiktokapis.com/v2/oauth/revoke/", { client_key: c.clientId, client_secret: c.clientSecret, token: accessToken }, "TikTok revoke");
    },
  };
}
