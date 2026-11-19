/**
 * Instagram through Facebook Login, using the same Meta app as Facebook (Meta
 * no longer offers Instagram Login to new apps). The Instagram account has to
 * be a Professional (Business or Creator) account linked to a Facebook Page the
 * person manages. Like Facebook, the Page token (which does not expire) is
 * stored; it can read the linked Instagram account's profile, media and insights.
 */
import { facebookCredentials, graph, metaLogin } from "./facebook";
import { getJson } from "./oauth";
import type { Provider } from "./types";

export const INSTAGRAM_SCOPES = ["instagram_basic", "instagram_manage_insights", "pages_show_list", "pages_read_engagement"];

/** Same Meta app as Facebook. */
export const instagramCredentials = facebookCredentials;

type PageWithInstagram = { id: string; access_token?: string; instagram_business_account?: { id: string; username?: string } };

export function instagramProvider(c: { clientId: string; clientSecret: string }): Provider {
  return {
    platform: "instagram",
    ...metaLogin(c, INSTAGRAM_SCOPES, "Instagram"),
    async fetchAccount(tokens) {
      const body = await getJson(graph("/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=25"), "Instagram account lookup", {
        Authorization: `Bearer ${tokens.accessToken}`,
      });
      // only Professional accounts linked to a Page show up here
      const page = (body.data as PageWithInstagram[] | undefined)?.find((p) => p.access_token && p.instagram_business_account?.id);
      const ig = page?.instagram_business_account;
      if (!page?.access_token || !ig) return { ok: false, reason: "no-account" };
      return {
        ok: true,
        externalId: ig.id,
        name: ig.username ? `@${ig.username}` : "Instagram account",
        tokens: { accessToken: page.access_token, refreshToken: null, expiresAt: null, scopes: tokens.scopes },
      };
    },
  };
}
