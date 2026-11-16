/**
 * Facebook Pages through Facebook Login. The user token is swapped for a
 * long-lived one, then for the Page token (which does not expire), so only the
 * Page token is stored. v1 connects the first Page the person manages.
 */
import { expiresIn, getJson, str, withQuery } from "./oauth";
import type { Provider } from "./types";

export const FACEBOOK_SCOPES = ["pages_show_list", "pages_read_engagement", "read_insights"];

export const graphVersion = () => process.env.META_GRAPH_VERSION || "v26.0";

export function facebookCredentials() {
  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function facebookProvider(c: { clientId: string; clientSecret: string }): Provider {
  const graph = (path: string) => `https://graph.facebook.com/${graphVersion()}${path}`;
  return {
    platform: "facebook",
    pkce: false,
    refreshWindowSeconds: 0,
    authorizeUrl: ({ redirectUri, state }) =>
      withQuery(`https://www.facebook.com/${graphVersion()}/dialog/oauth`, {
        client_id: c.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: FACEBOOK_SCOPES.join(","),
        state,
      }),
    async exchangeCode({ code, redirectUri }) {
      const short = await getJson(
        withQuery(graph("/oauth/access_token"), { client_id: c.clientId, client_secret: c.clientSecret, redirect_uri: redirectUri, code }),
        "Facebook token exchange",
      );
      const long = await getJson(
        withQuery(graph("/oauth/access_token"), {
          grant_type: "fb_exchange_token",
          client_id: c.clientId,
          client_secret: c.clientSecret,
          fb_exchange_token: str(short.access_token) ?? "",
        }),
        "Facebook long-lived token",
      );
      return { accessToken: str(long.access_token) ?? "", refreshToken: null, expiresAt: expiresIn(long.expires_in), scopes: FACEBOOK_SCOPES.join(",") };
    },
    async fetchAccount(tokens) {
      const body = await getJson(graph("/me/accounts?fields=id,name,access_token&limit=25"), "Facebook Page lookup", {
        Authorization: `Bearer ${tokens.accessToken}`,
      });
      const page = (body.data as { id: string; name?: string; access_token?: string }[] | undefined)?.find((p) => p.access_token);
      if (!page?.access_token) return { ok: false, reason: "no-account" };
      return {
        ok: true,
        externalId: page.id,
        name: page.name || "Facebook Page",
        // Page tokens made from a long-lived user token do not expire
        tokens: { accessToken: page.access_token, refreshToken: null, expiresAt: null, scopes: tokens.scopes },
      };
    },
  };
}
