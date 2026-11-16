import { createHash, randomBytes } from "node:crypto";
import { ProviderError, ReauthRequired } from "./types";

type Json = Record<string, unknown>;

/** Error codes that mean "connect again" rather than "try later" (190: Meta's invalid or expired token). */
const REAUTH_CODES = new Set(["invalid_grant", "invalid_token", "expired_token", "access_token_invalid", "refresh_token_invalid", "190"]);

async function parse(res: Response, what: string): Promise<Json> {
  const text = await res.text();
  let body: Json = {};
  try {
    body = text ? (JSON.parse(text) as Json) : {};
  } catch {
    /* non-JSON error page */
  }
  // TikTok and Meta return errors inside a 200 or 4xx JSON body
  const err = body.error as string | { code?: string | number; message?: string; type?: string } | undefined;
  const code = typeof err === "string" ? err : err && typeof err === "object" ? String(err.code ?? err.type ?? "") : undefined;
  const failed = !res.ok || (typeof err === "string" && err !== "") || (err && typeof err === "object" && code !== "ok" && code !== "");
  if (failed) {
    if (res.status === 401 || (code && REAUTH_CODES.has(code))) throw new ReauthRequired(`${what}: ${code ?? res.status}`);
    throw new ProviderError(`${what} failed (${res.status}${code ? `, ${code}` : ""})`, res.status, code);
  }
  return body;
}

export async function postForm(url: string, form: Record<string, string>, what: string, headers: Record<string, string> = {}): Promise<Json> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", ...headers },
    body: new URLSearchParams(form),
    cache: "no-store",
  });
  return parse(res, what);
}

export async function postJson(url: string, body: unknown, what: string, headers: Record<string, string> = {}): Promise<Json> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parse(res, what);
}

export async function getJson(url: string, what: string, headers: Record<string, string> = {}): Promise<Json> {
  const res = await fetch(url, { headers: { Accept: "application/json", ...headers }, cache: "no-store" });
  return parse(res, what);
}

export function withQuery(base: string, params: Record<string, string>): string {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}

export function expiresIn(seconds: unknown): Date | null {
  const n = Number(seconds);
  return Number.isFinite(n) && n > 0 ? new Date(Date.now() + n * 1000) : null;
}

export const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null);
