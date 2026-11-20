/**
 * YouTube through Google OAuth. Uses the same OAuth client as Google sign-in;
 * add /api/connect/youtube/callback to its redirect URIs.
 */
import { YOUTUBE_SCOPES } from "../scopes";
import { expiresIn, getJson, postForm, str, withQuery } from "./oauth";
import { ReauthRequired, type Provider, type TokenSet } from "./types";

export function youtubeCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

function tokens(body: Record<string, unknown>, previousRefresh: string | null = null): TokenSet {
  return {
    accessToken: str(body.access_token) ?? "",
    // Google only returns a refresh token on consent; keep the old one on refresh
    refreshToken: str(body.refresh_token) ?? previousRefresh,
    expiresAt: expiresIn(body.expires_in),
    scopes: str(body.scope),
  };
}

export function youtubeProvider(c: { clientId: string; clientSecret: string }): Provider {
  return {
    platform: "youtube",
    pkce: true,
    refreshWindowSeconds: 5 * 60,
    authorizeUrl: ({ redirectUri, state, codeChallenge }) =>
      withQuery("https://accounts.google.com/o/oauth2/v2/auth", {
        client_id: c.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: YOUTUBE_SCOPES.join(" "),
        access_type: "offline",
        // consent every time so Google always returns a refresh token
        prompt: "consent",
        include_granted_scopes: "true",
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      }),
    async exchangeCode({ code, redirectUri, codeVerifier }) {
      const body = await postForm(
        "https://oauth2.googleapis.com/token",
        { client_id: c.clientId, client_secret: c.clientSecret, code, code_verifier: codeVerifier, grant_type: "authorization_code", redirect_uri: redirectUri },
        "YouTube token exchange",
      );
      return tokens(body);
    },
    async fetchAccount({ accessToken }) {
      const body = await getJson("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", "YouTube channel lookup", {
        Authorization: `Bearer ${accessToken}`,
      });
      const channel = (body.items as { id: string; snippet?: { title?: string } }[] | undefined)?.[0];
      if (!channel) return { ok: false, reason: "no-account" };
      return { ok: true, externalId: channel.id, name: channel.snippet?.title || "YouTube channel" };
    },
    async refresh({ refreshToken }) {
      if (!refreshToken) throw new ReauthRequired("No refresh token");
      const body = await postForm(
        "https://oauth2.googleapis.com/token",
        { client_id: c.clientId, client_secret: c.clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" },
        "YouTube token refresh",
      );
      return tokens(body, refreshToken);
    },
    async revoke({ accessToken, refreshToken }) {
      await postForm("https://oauth2.googleapis.com/revoke", { token: refreshToken ?? accessToken }, "YouTube revoke");
    },
  };
}
