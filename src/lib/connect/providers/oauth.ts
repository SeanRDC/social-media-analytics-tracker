import { createHash, randomBytes } from "node:crypto";
import { ProviderError, RateLimited, ReauthRequired } from "./types";

type Json = Record<string, unknown>;

/** Error codes that mean "connect again" rather than "try later" (190: Meta's invalid or expired token). */
const REAUTH_CODES = new Set(["invalid_grant", "invalid_token", "expired_token", "access_token_invalid", "refresh_token_invalid", "190"]);

/** Meta's rate-limit error codes (app, user, Page and API-level throttling). */
const META_RATE_CODES = new Set(["4", "17", "32", "613"]);
/** Google's quota reasons. */
const GOOGLE_RATE_REASONS = new Set(["quotaExceeded", "rateLimitExceeded", "userRateLimitExceeded", "dailyLimitExceeded"]);

const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
const ATTEMPTS = 3;
const MAX_WAIT_MS = 10_000;

/** Base backoff; tests set PLATFORM_RETRY_BASE_MS=0. */
const baseDelay = () => Number(process.env.PLATFORM_RETRY_BASE_MS ?? 500);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Seconds or an HTTP date → milliseconds, or null. */
function retryAfterMs(res: Response): number | null {
  const v = res.headers.get("retry-after");
  if (!v) return null;
  const s = Number(v);
  if (Number.isFinite(s)) return s * 1000;
  const t = Date.parse(v);
  return Number.isFinite(t) ? Math.max(0, t - Date.now()) : null;
}

/**
 * fetch with retries for network errors, 429 and 5xx: exponential backoff with
 * jitter, honouring Retry-After when it is short. A long Retry-After means the
 * platform wants us gone for a while, so that returns at once as RateLimited.
 */
async function send(url: string, init: () => RequestInit, what: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const backoff = baseDelay() * 2 ** (attempt - 1) * (0.75 + Math.random() * 0.5);
    let res: Response;
    try {
      res = await fetch(url, init());
    } catch {
      if (attempt >= ATTEMPTS) throw new ProviderError(`${what} failed (network)`, 0, "network");
      await sleep(backoff);
      continue;
    }
    if (!RETRY_STATUS.has(res.status) || attempt >= ATTEMPTS) return res;
    const wait = retryAfterMs(res);
    if (wait !== null && wait > MAX_WAIT_MS) return res;
    // free the connection before waiting
    await res.arrayBuffer().catch(() => undefined);
    await sleep(wait ?? backoff);
  }
}

async function parse(res: Response, what: string): Promise<Json> {
  const text = await res.text();
  let body: Json = {};
  try {
    body = text ? (JSON.parse(text) as Json) : {};
  } catch {
    /* non-JSON error page */
  }
  // TikTok and Meta return errors inside a 200 or 4xx JSON body
  const err = body.error as string | { code?: string | number; message?: string; type?: string; error_subcode?: number } | undefined;
  const code = typeof err === "string" ? err : err && typeof err === "object" ? String(err.code ?? err.type ?? "") : undefined;
  const failed = !res.ok || (typeof err === "string" && err !== "") || (err && typeof err === "object" && code !== "ok" && code !== "");
  if (failed) {
    if (res.status === 401 || (code && REAUTH_CODES.has(code))) {
      // keep the platform's reason (e.g. Meta's subcode 460/463/467) so Settings and logs say why
      const sub = err && typeof err === "object" && err.error_subcode ? `/${err.error_subcode}` : "";
      const why = err && typeof err === "object" && err.message ? `: ${err.message}` : "";
      throw new ReauthRequired(`${what} (${code ?? res.status}${sub})${why}`);
    }
    const reason = (err as { errors?: { reason?: string }[] } | undefined)?.errors?.[0]?.reason;
    if (res.status === 429 || (code && META_RATE_CODES.has(code)) || (reason && GOOGLE_RATE_REASONS.has(reason)) || code === "rate_limit_exceeded") {
      throw new RateLimited(`${what} is rate limited (${reason ?? code ?? res.status})`, res.status, reason ?? code);
    }
    // keep the platform's own explanation (e.g. Google's "accessNotConfigured" and its message) so logs say what to fix
    const label = reason ?? code;
    // TikTok and plain OAuth errors put the explanation in error_description
    const description = typeof body.error_description === "string" ? body.error_description : null;
    const detail = err && typeof err === "object" && err.message ? `: ${err.message}` : description ? `: ${description}` : "";
    throw new ProviderError(`${what} failed (${res.status}${label ? `, ${label}` : ""})${detail}`, res.status, code);
  }
  return body;
}

export async function postForm(url: string, form: Record<string, string>, what: string, headers: Record<string, string> = {}): Promise<Json> {
  const res = await send(
    url,
    () => ({ method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", ...headers }, body: new URLSearchParams(form), cache: "no-store" }),
    what,
  );
  return parse(res, what);
}

export async function postJson(url: string, body: unknown, what: string, headers: Record<string, string> = {}): Promise<Json> {
  const res = await send(url, () => ({ method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", ...headers }, body: JSON.stringify(body), cache: "no-store" }), what);
  return parse(res, what);
}

export async function getJson(url: string, what: string, headers: Record<string, string> = {}): Promise<Json> {
  const res = await send(url, () => ({ headers: { Accept: "application/json", ...headers }, cache: "no-store" }), what);
  return parse(res, what);
}

export function withQuery(base: string, params: Record<string, string>): string {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

/** PKCE verifier and S256 challenge. TikTok wants the SHA-256 hex-encoded; the standard (RFC 7636) is base64url. */
export function pkcePair(encoding: "base64url" | "hex" = "base64url"): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest(encoding) };
}

export function expiresIn(seconds: unknown): Date | null {
  const n = Number(seconds);
  return Number.isFinite(n) && n > 0 ? new Date(Date.now() + n * 1000) : null;
}

export const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null);
