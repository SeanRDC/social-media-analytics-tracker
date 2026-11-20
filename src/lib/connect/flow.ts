/**
 * The OAuth round trip, kept free of Next.js so it can be tested directly.
 * State and the PKCE verifier travel in a short-lived encrypted cookie tied to
 * the signed-in user; the callback reports back with ?connect=ok|error.
 */
import { describeError } from "@/lib/safe-error";
import { randomBytes } from "node:crypto";
import type { Db } from "@/db";
import type { PlatformId } from "@/lib/data/types";
import { seal, unseal } from "./crypto";
import { pkcePair } from "./providers/oauth";
import type { AccountOption, AccountResult, TokenSet } from "./providers";
import { resolveProvider } from "./providers";
import type { ConnectReason as ConnectErrorReason } from "./result";
import { refreshSiblings, saveConnection } from "./service";

export const STATE_COOKIE = "connect_state";
export const STATE_TTL_SECONDS = 10 * 60;
/** Holds the login while the person picks one of several Pages; encrypted, short-lived. */
export const PICK_COOKIE = "connect_pick";
export const PICK_TTL_SECONDS = 10 * 60;
export const CHOOSE_PATH = "/onboarding/choose";

/** Where the flow may send people back to. Anything else falls back to onboarding. */
const RETURN_PATHS = new Set(["/onboarding/connect", "/settings"]);
export function safeReturnTo(path: string | null | undefined): string {
  return path && RETURN_PATHS.has(path) ? path : "/onboarding/connect";
}

interface State {
  state: string;
  verifier: string;
  platform: string;
  userId: string;
  returnTo: string;
}

const callbackUrl = (baseUrl: string, platform: string) => `${baseUrl.replace(/\/$/, "")}/api/connect/${platform}/callback`;

function result(returnTo: string, platform: string, outcome: { ok: true } | { ok: false; reason: ConnectErrorReason }) {
  const q = new URLSearchParams({ connect: outcome.ok ? "ok" : "error", platform });
  if (!outcome.ok) q.set("reason", outcome.reason);
  return `${returnTo}?${q}`;
}

export function beginConnect(a: { platform: string; userId: string; returnTo: string | null; baseUrl: string }): { location: string; cookie?: string } {
  const returnTo = safeReturnTo(a.returnTo);
  const resolved = resolveProvider(a.platform);
  if (!resolved) return { location: result(returnTo, a.platform, { ok: false, reason: "unavailable" }) };
  const { provider } = resolved;
  const state = randomBytes(24).toString("base64url");
  const { verifier, challenge } = pkcePair(provider.pkceEncoding);
  const payload: State = { state, verifier: provider.pkce ? verifier : "", platform: a.platform, userId: a.userId, returnTo };
  return {
    location: provider.authorizeUrl({ redirectUri: callbackUrl(a.baseUrl, a.platform), state, codeChallenge: challenge }),
    cookie: seal(payload, STATE_TTL_SECONDS),
  };
}

export async function completeConnect(a: { platform: string; query: URLSearchParams; cookie: string | undefined; userId: string; baseUrl: string; db: Db }): Promise<{ location: string; pick?: string }> {
  const saved = a.cookie ? unseal<State>(a.cookie) : null;
  const returnTo = safeReturnTo(saved?.returnTo);
  const fail = (reason: ConnectErrorReason) => ({ location: result(returnTo, a.platform, { ok: false, reason }) });

  const stateOk = saved && saved.platform === a.platform && saved.userId === a.userId && saved.state === a.query.get("state");
  // the platform's own error (e.g. the person pressed Cancel) still needs a matching state
  if (a.query.get("error")) return fail(stateOk ? "denied" : "state");
  if (!stateOk) return fail("state");
  const code = a.query.get("code");
  if (!code) return fail("failed");

  const resolved = resolveProvider(a.platform);
  if (!resolved) return fail("unavailable");
  const { provider } = resolved;
  try {
    const tokens = await provider.exchangeCode({ code, redirectUri: callbackUrl(a.baseUrl, a.platform), codeVerifier: saved.verifier });
    const account = await provider.fetchAccount(tokens);
    if (account.ok === "choose") {
      // several Pages: keep the login (encrypted, minutes only) while the person picks one
      const pick: Pick = { platform: a.platform, userId: a.userId, returnTo, tokens, options: account.options };
      return { location: CHOOSE_PATH, pick: seal(pick, PICK_TTL_SECONDS) };
    }
    return { location: await finish(a.db, a.userId, a.platform as PlatformId, tokens, account, returnTo) };
  } catch (e) {
    // never log tokens: provider errors carry only status and error code
    console.error(`[connect] ${a.platform} failed:`, describeError(e));
    return fail("failed");
  }
}

/** Stores the chosen account and its token (and the token's siblings), then reports back. */
async function finish(db: Db, userId: string, platform: PlatformId, tokens: TokenSet, account: AccountResult, returnTo: string): Promise<string> {
  if (account.ok === "choose") throw new Error("finish needs one account");
  if (!account.ok) return result(returnTo, platform, { ok: false, reason: account.reason });
  const stored = account.tokens ?? tokens;
  await saveConnection(db, userId, platform, stored, { externalId: account.externalId, name: account.name });
  if (account.siblings?.length) await refreshSiblings(db, userId, stored, account.siblings);
  return result(returnTo, platform, { ok: true });
}

interface Pick {
  platform: string;
  userId: string;
  returnTo: string;
  tokens: TokenSet;
  options: AccountOption[];
}

/** The Pages waiting to be chosen from, for the signed-in person only. */
export function readChoice(cookie: string | undefined, userId: string): { platform: PlatformId; options: AccountOption[]; returnTo: string } | null {
  const pick = cookie ? unseal<Pick>(cookie) : null;
  if (!pick || pick.userId !== userId || !resolveProvider(pick.platform)) return null;
  return { platform: pick.platform as PlatformId, options: pick.options, returnTo: pick.returnTo };
}

/** Connects the Page the person picked from the choose screen. */
export async function finishChoice(a: { cookie: string | undefined; userId: string; externalId: string; db: Db }): Promise<{ location: string }> {
  const pick = a.cookie ? unseal<Pick>(a.cookie) : null;
  const resolved = pick && pick.userId === a.userId ? resolveProvider(pick.platform) : null;
  if (!pick || !resolved) return { location: result(safeReturnTo(pick?.returnTo), pick?.platform ?? "facebook", { ok: false, reason: "state" }) };
  const fail = (reason: ConnectErrorReason) => ({ location: result(pick.returnTo, pick.platform, { ok: false, reason }) });
  if (!pick.options.some((o) => o.externalId === a.externalId)) return fail("state");
  try {
    const tokens = { ...pick.tokens, expiresAt: pick.tokens.expiresAt ? new Date(pick.tokens.expiresAt) : null };
    const account = await resolved.provider.fetchAccount(tokens, a.externalId);
    return { location: await finish(a.db, a.userId, pick.platform as PlatformId, tokens, account, pick.returnTo) };
  } catch (e) {
    console.error(`[connect] ${pick.platform} choice failed:`, describeError(e));
    return fail("failed");
  }
}
