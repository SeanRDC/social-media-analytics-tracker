import type { PlatformId } from "@/lib/data/types";

/** Tokens as a platform returns them, normalised. */
export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  /** When the access token stops working; null when it does not expire. */
  expiresAt: Date | null;
  /** Granted scopes as the platform reports them (people can decline some). */
  scopes: string | null;
}

export type AccountResult =
  | {
      ok: true;
      /** The platform's own id (channel, Page, account or organization). */
      externalId: string;
      name: string;
      /** Replaces the user tokens, e.g. a Facebook Page token. */
      tokens?: TokenSet;
      /**
       * Other connections the same token can read (Facebook and Instagram share
       * one Page token). A new login invalidates the old token, so these get it too.
       */
      siblings?: { platform: PlatformId; externalId: string }[];
    }
  | { ok: false; reason: "needs-professional" | "no-account" }
  /** The person manages several (Pages, organizations): ask which one, then call fetchAccount again with it. */
  | { ok: "choose"; options: AccountOption[] };

/** One account the person could connect, as shown on the "choose a Page" screen. */
export interface AccountOption {
  externalId: string;
  name: string;
}

/**
 * One rule for every platform with several accounts per login: the chosen one
 * when there is a choice, the only one when there is one, otherwise ask.
 * Returns the item, "none", or the options to choose from.
 */
export function pickAccount<T>(items: T[], option: (item: T) => AccountOption, choice?: string): T | "none" | AccountOption[] {
  if (choice !== undefined) return items.find((i) => option(i).externalId === choice) ?? "none";
  if (items.length === 0) return "none";
  if (items.length === 1) return items[0];
  return items.map(option);
}

export interface Provider {
  platform: PlatformId;
  /** Send a PKCE code challenge with the authorize request. */
  pkce: boolean;
  /** How the PKCE challenge is encoded; TikTok uses hex. Defaults to base64url. */
  pkceEncoding?: "base64url" | "hex";
  /** Refresh once the access token expires within this many seconds. */
  refreshWindowSeconds: number;
  authorizeUrl(a: { redirectUri: string; state: string; codeChallenge: string }): string;
  exchangeCode(a: { code: string; redirectUri: string; codeVerifier: string }): Promise<TokenSet>;
  /** The account to connect. With several, returns the options; call again with `choice` (an option's externalId). */
  fetchAccount(tokens: TokenSet, choice?: string): Promise<AccountResult>;
  /** Throws ReauthRequired when the platform refuses (revoked, expired refresh token). */
  refresh?(tokens: { accessToken: string; refreshToken: string | null }): Promise<TokenSet>;
  /** Best effort; failures are ignored by the caller. */
  revoke?(tokens: { accessToken: string; refreshToken: string | null }): Promise<void>;
}

/** The person has to connect again (access revoked or a refresh token expired). */
export class ReauthRequired extends Error {
  constructor(message = "The platform needs you to connect again") {
    super(message);
    this.name = "ReauthRequired";
  }
}

/** Any other unexpected response from a platform. Never includes tokens. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/** The platform's quota or rate limit was hit: try again later; the connection itself is fine. */
export class RateLimited extends ProviderError {
  constructor(message: string, status: number, code?: string) {
    super(message, status, code);
    this.name = "RateLimited";
  }
}
