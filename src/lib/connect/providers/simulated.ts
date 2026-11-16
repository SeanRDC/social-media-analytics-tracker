/**
 * Stands in for a platform when its credentials are missing outside production,
 * so the whole connect flow (state cookie, encryption, storage, refresh) runs
 * locally with no developer accounts. Simulated connections use an external id
 * starting with "simulated:" so later phases can serve sample stats for them.
 */
import { randomBytes } from "node:crypto";
import type { PlatformId } from "@/lib/data/types";
import { PLATFORM_NAMES } from "@/lib/platforms";
import { withQuery } from "./oauth";
import type { Provider, TokenSet } from "./types";

export const SIMULATED_PREFIX = "simulated:";

const fakeTokens = (): TokenSet => ({
  accessToken: `sim-${randomBytes(12).toString("hex")}`,
  refreshToken: `sim-refresh-${randomBytes(12).toString("hex")}`,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  scopes: "simulated",
});

export function simulatedProvider(platform: PlatformId): Provider {
  return {
    platform,
    pkce: false,
    refreshWindowSeconds: 5 * 60,
    // skip the platform: straight back to our own callback
    authorizeUrl: ({ redirectUri, state }) => withQuery(redirectUri, { code: "simulated", state }),
    exchangeCode: async () => fakeTokens(),
    fetchAccount: async () => ({ ok: true, externalId: `${SIMULATED_PREFIX}${platform}`, name: `Sample ${PLATFORM_NAMES[platform]} account` }),
    refresh: async () => fakeTokens(),
    revoke: async () => {},
  };
}
