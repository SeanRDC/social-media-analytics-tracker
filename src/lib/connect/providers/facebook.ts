/**
 * Facebook Pages through Facebook Login. The user token is swapped for a
 * long-lived one, then for the Page token (which does not expire), so only the
 * Page token is stored. Someone who manages several Pages chooses one.
 */
import { META_SCOPES } from "../scopes";
import { expiresIn, getJson, str, withQuery } from "./oauth";
import { pickAccount, type Provider } from "./types";

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
    async fetchAccount(tokens, choice) {
      const body = await getJson(graph("/me/accounts?fields=id,name,access_token,instagram_business_account{id}&limit=25"), "Facebook Page lookup", {
        Authorization: `Bearer ${tokens.accessToken}`,
      });
      type Page = { id: string; name?: string; access_token?: string; instagram_business_account?: { id: string } };
      const pages = ((body.data as Page[] | undefined) ?? []).filter((p): p is Page & { access_token: string } => Boolean(p.access_token));
      const page = pickAccount(pages, (p) => ({ externalId: p.id, name: p.name || "Facebook Page" }), choice);
      if (page === "none") return { ok: false, reason: "no-account" };
      if (Array.isArray(page)) return { ok: "choose", options: page };
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
