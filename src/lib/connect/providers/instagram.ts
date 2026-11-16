/**
 * Instagram through Instagram Login (no Facebook Page needed). Only
 * Professional (Business or Creator) accounts have insights. The short-lived
 * token is swapped for a 60-day one, refreshed while still valid.
 */
import { expiresIn, getJson, postForm, str, withQuery } from "./oauth";
import type { Provider, TokenSet } from "./types";

export const INSTAGRAM_SCOPES = ["instagram_business_basic", "instagram_business_manage_insights"];
const PROFESSIONAL = new Set(["BUSINESS", "MEDIA_CREATOR"]);

export function instagramCredentials() {
  const clientId = process.env.INSTAGRAM_APP_ID;
  const clientSecret = process.env.INSTAGRAM_APP_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

const longLived = (body: Record<string, unknown>, scopes: string | null): TokenSet => ({
  accessToken: str(body.access_token) ?? "",
  refreshToken: null,
  expiresAt: expiresIn(body.expires_in),
  scopes,
});

export function instagramProvider(c: { clientId: string; clientSecret: string }): Provider {
  return {
    platform: "instagram",
    pkce: false,
    // long-lived tokens last 60 days; refresh in the last 10
    refreshWindowSeconds: 10 * 24 * 60 * 60,
    authorizeUrl: ({ redirectUri, state }) =>
      withQuery("https://www.instagram.com/oauth/authorize", {
        client_id: c.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: INSTAGRAM_SCOPES.join(","),
        state,
      }),
    async exchangeCode({ code, redirectUri }) {
      const short = await postForm(
        "https://api.instagram.com/oauth/access_token",
        { client_id: c.clientId, client_secret: c.clientSecret, grant_type: "authorization_code", redirect_uri: redirectUri, code },
        "Instagram token exchange",
      );
      // older responses wrap the token in data[0]
      const first = (Array.isArray(short.data) ? short.data[0] : short) as Record<string, unknown>;
      const granted = Array.isArray(first.permissions) ? first.permissions.join(",") : str(first.permissions);
      const long = await getJson(
        withQuery("https://graph.instagram.com/access_token", { grant_type: "ig_exchange_token", client_secret: c.clientSecret, access_token: str(first.access_token) ?? "" }),
        "Instagram long-lived token",
      );
      return longLived(long, granted);
    },
    async fetchAccount({ accessToken }) {
      const me = await getJson(withQuery("https://graph.instagram.com/me", { fields: "user_id,username,account_type" }), "Instagram account lookup", {
        Authorization: `Bearer ${accessToken}`,
      });
      if (!PROFESSIONAL.has(String(me.account_type))) return { ok: false, reason: "needs-professional" };
      const id = str(me.user_id) ?? str(me.id);
      if (!id) return { ok: false, reason: "no-account" };
      return { ok: true, externalId: id, name: me.username ? `@${me.username}` : "Instagram account" };
    },
    async refresh({ accessToken }) {
      const body = await getJson(
        withQuery("https://graph.instagram.com/refresh_access_token", { grant_type: "ig_refresh_token", access_token: accessToken }),
        "Instagram token refresh",
      );
      return longLived(body, null);
    },
  };
}
