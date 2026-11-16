/**
 * The OAuth round trip, kept free of Next.js so it can be tested directly.
 * State and the PKCE verifier travel in a short-lived encrypted cookie tied to
 * the signed-in user; the callback reports back with ?connect=ok|error.
 */
import { randomBytes } from "node:crypto";
import type { Db } from "@/db";
import type { PlatformId } from "@/lib/data/types";
import { seal, unseal } from "./crypto";
import { pkcePair } from "./providers/oauth";
import { ProviderError, ReauthRequired, resolveProvider } from "./providers";
import type { ConnectReason as ConnectErrorReason } from "./result";
import { saveConnection } from "./service";

export const STATE_COOKIE = "connect_state";
export const STATE_TTL_SECONDS = 10 * 60;

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
  const { verifier, challenge } = pkcePair();
  const payload: State = { state, verifier: provider.pkce ? verifier : "", platform: a.platform, userId: a.userId, returnTo };
  return {
    location: provider.authorizeUrl({ redirectUri: callbackUrl(a.baseUrl, a.platform), state, codeChallenge: challenge }),
    cookie: seal(payload, STATE_TTL_SECONDS),
  };
}

export async function completeConnect(a: { platform: string; query: URLSearchParams; cookie: string | undefined; userId: string; baseUrl: string; db: Db }): Promise<{ location: string }> {
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
    if (!account.ok) return fail(account.reason);
    await saveConnection(a.db, a.userId, a.platform as PlatformId, account.tokens ?? tokens, { externalId: account.externalId, name: account.name });
    return { location: result(returnTo, a.platform, { ok: true }) };
  } catch (e) {
    // never log tokens: provider errors carry only status and error code
    console.error(`[connect] ${a.platform} failed:`, e instanceof ProviderError || e instanceof ReauthRequired ? e.message : e);
    return fail("failed");
  }
}
