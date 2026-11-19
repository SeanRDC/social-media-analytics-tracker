/**
 * Facebook Pages through Facebook Login. The user token is swapped for a
 * long-lived one, then for the Page token (which does not expire), so only the
 * Page token is stored. v1 connects the first Page the person manages.
 */
import { expiresIn, getJson, str, withQuery } from "./oauth";
import type { Provider } from "./types";

// pages_read_user_content is needed to list the Page's posts (/published_posts)
export const FACEBOOK_SCOPES = ["pages_show_list", "pages_read_engagement", "pages_read_user_content", "read_insights"];
// business_management: Pages and Instagram accounts in a business portfolio only show their link with it
const INSTAGRAM_ONLY = ["instagram_basic", "instagram_manage_insights", "business_management"];
/**
 * Facebook and Instagram ask for the same permissions: each new Meta login
 * replaces the app's access to the Page (the old Page token then fails with
 * 190/492), so either login has to produce a token that serves both.
 */
export const META_SCOPES = [...FACEBOOK_SCOPES, ...INSTAGRAM_ONLY];

export const graphVersion = () => process.env.META_GRAPH_VERSION || "v26.0";

export function facebookCredentials() {
  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export const graph = (path: string) => `https://graph.facebook.com/${graphVersion()}${path}`;

/**
 * Facebook Login shared by Facebook and Instagram (Meta no longer offers
 * Instagram Login to new apps): the authorize URL and the code exchange that
 * ends with a long-lived user token.
 */
export function metaLogin(c: { clientId: string; clientSecret: string }, scopes: string[], label: string): Pick<Provider, "pkce" | "refreshWindowSeconds" | "authorizeUrl" | "exchangeCode"> {
  return {
    pkce: false,
    refreshWindowSeconds: 0,
    authorizeUrl: ({ redirectUri, state }) =>
      withQuery(`https://www.facebook.com/${graphVersion()}/dialog/oauth`, {
        client_id: c.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: scopes.join(","),
        state,
      }),
    async exchangeCode({ code, redirectUri }) {
      const short = await getJson(
        withQuery(graph("/oauth/access_token"), { client_id: c.clientId, client_secret: c.clientSecret, redirect_uri: redirectUri, code }),
        `${label} token exchange`,
      );
      const long = await getJson(
        withQuery(graph("/oauth/access_token"), {
          grant_type: "fb_exchange_token",
          client_id: c.clientId,
          client_secret: c.clientSecret,
          fb_exchange_token: str(short.access_token) ?? "",
        }),
        `${label} long-lived token`,
      );
      return { accessToken: str(long.access_token) ?? "", refreshToken: null, expiresAt: expiresIn(long.expires_in), scopes: scopes.join(",") };
    },
  };
}

export function facebookProvider(c: { clientId: string; clientSecret: string }): Provider {
  return {
    platform: "facebook",
    ...metaLogin(c, META_SCOPES, "Facebook"),
    async fetchAccount(tokens) {
      const body = await getJson(graph("/me/accounts?fields=id,name,access_token,instagram_business_account{id}&limit=25"), "Facebook Page lookup", {
        Authorization: `Bearer ${tokens.accessToken}`,
      });
      const page = (body.data as { id: string; name?: string; access_token?: string; instagram_business_account?: { id: string } }[] | undefined)?.find((p) => p.access_token);
      if (!page?.access_token) return { ok: false, reason: "no-account" };
      return {
        ok: true,
        externalId: page.id,
        name: page.name || "Facebook Page",
        // Page tokens made from a long-lived user token do not expire
        tokens: { accessToken: page.access_token, refreshToken: null, expiresAt: null, scopes: tokens.scopes },
        siblings: page.instagram_business_account?.id ? [{ platform: "instagram" as const, externalId: page.instagram_business_account.id }] : [],
      };
    },
  };
}
