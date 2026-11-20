/**
 * LinkedIn Pages through the Community Management API (organization pages only).
 * Access tokens last 60 days. Refresh tokens are only issued to approved
 * partners; without one the connection turns "expired" and asks to reconnect.
 * Someone who administers several Pages chooses one (up to 20 are offered).
 */
import { LINKEDIN_SCOPES } from "../scopes";
import { expiresIn, getJson, postForm, str, withQuery } from "./oauth";
import { pickAccount, ReauthRequired, type Provider, type TokenSet } from "./types";

/** YYYYMM; LinkedIn retires versions after about a year, so keep this current. */
/** At most this many Pages are offered on the choose screen. */
const MAX_PAGES = 20;

export const linkedinVersion = () => process.env.LINKEDIN_API_VERSION || "202607";

export function linkedinCredentials() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

const tokens = (body: Record<string, unknown>, previousRefresh: string | null = null): TokenSet => ({
  accessToken: str(body.access_token) ?? "",
  refreshToken: str(body.refresh_token) ?? previousRefresh,
  expiresAt: expiresIn(body.expires_in),
  scopes: str(body.scope),
});

export function linkedinProvider(c: { clientId: string; clientSecret: string }): Provider {
  const rest = (accessToken: string) => ({
    Authorization: `Bearer ${accessToken}`,
    "LinkedIn-Version": linkedinVersion(),
    "X-Restli-Protocol-Version": "2.0.0",
  });
  return {
    platform: "linkedin",
    pkce: false,
    refreshWindowSeconds: 24 * 60 * 60,
    authorizeUrl: ({ redirectUri, state }) =>
      withQuery("https://www.linkedin.com/oauth/v2/authorization", {
        client_id: c.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: LINKEDIN_SCOPES.join(" "),
        state,
      }),
    async exchangeCode({ code, redirectUri }) {
      return tokens(
        await postForm(TOKEN_URL, { grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: c.clientId, client_secret: c.clientSecret }, "LinkedIn token exchange"),
      );
    },
    async fetchAccount({ accessToken }, choice) {
      const acls = await getJson(
        "https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED",
        "LinkedIn Page lookup",
        rest(accessToken),
      );
      const ids = [...new Set(((acls.elements as { organization?: string }[] | undefined) ?? []).map((e) => e.organization?.split(":").pop()).filter((id): id is string => Boolean(id)))].slice(0, MAX_PAGES);
      const nameOf = async (id: string) => {
        const org = await getJson(`https://api.linkedin.com/rest/organizations/${encodeURIComponent(id)}`, "LinkedIn Page name", rest(accessToken));
        return str(org.localizedName) ?? "LinkedIn Page";
      };
      // names are fetched only for what is shown: every option when choosing, else the one being connected
      const picked = pickAccount(ids, (id) => ({ externalId: id, name: id }), choice);
      if (picked === "none") return { ok: false, reason: "no-account" };
      if (Array.isArray(picked)) return { ok: "choose", options: await Promise.all(picked.map(async (o) => ({ externalId: o.externalId, name: await nameOf(o.externalId) }))) };
      return { ok: true, externalId: picked, name: await nameOf(picked) };
    },
    async refresh({ refreshToken }) {
      if (!refreshToken) throw new ReauthRequired("LinkedIn did not issue a refresh token");
      return tokens(
        await postForm(TOKEN_URL, { grant_type: "refresh_token", refresh_token: refreshToken, client_id: c.clientId, client_secret: c.clientSecret }, "LinkedIn token refresh"),
        refreshToken,
      );
    },
    async revoke({ accessToken }) {
      await postForm("https://www.linkedin.com/oauth/v2/revoke", { client_id: c.clientId, client_secret: c.clientSecret, token: accessToken }, "LinkedIn revoke");
    },
  };
}
