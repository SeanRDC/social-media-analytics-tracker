/**
 * The ?connect=ok|error&platform=…&reason=… the connect flow returns with, and
 * the words shown for it. Safe to import from client components.
 */
import { PLATFORM_ORDER, type PlatformId } from "@/lib/data/types";
import { PLATFORM_NAMES } from "@/lib/platforms";

export type ConnectReason = "denied" | "state" | "needs-professional" | "no-account" | "unavailable" | "busy" | "failed";

export interface ConnectResult {
  platform: PlatformId;
  ok: boolean;
  reason?: ConnectReason;
}

const REASONS: ConnectReason[] = ["denied", "state", "needs-professional", "no-account", "unavailable", "busy", "failed"];

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseConnectResult(params: Params): ConnectResult | null {
  const platform = one(params.platform) as PlatformId;
  const outcome = one(params.connect);
  if (!PLATFORM_ORDER.includes(platform) || (outcome !== "ok" && outcome !== "error")) return null;
  if (outcome === "ok") return { platform, ok: true };
  const reason = one(params.reason) as ConnectReason;
  return { platform, ok: false, reason: REASONS.includes(reason) ? reason : "failed" };
}

const NO_ACCOUNT: Partial<Record<PlatformId, string>> = {
  youtube: "That Google account has no YouTube channel. Choose the account that owns your channel.",
  facebook: "We couldn't find a Facebook Page you manage. Use the account that manages your Page.",
  linkedin: "We couldn't find a LinkedIn Page you administer. Only company Pages can be connected.",
};

export function connectMessage(r: ConnectResult): string {
  const name = PLATFORM_NAMES[r.platform];
  if (r.ok) return `${name} is connected.`;
  switch (r.reason) {
    case "denied":
      return `You cancelled on ${name}. Connect again whenever you're ready.`;
    case "state":
      return `That approval expired or came from another tab. Please connect ${name} again.`;
    case "needs-professional":
      return "Instagram only shares stats for Professional accounts.";
    case "no-account":
      return NO_ACCOUNT[r.platform] ?? `We couldn't find a ${name} account to connect.`;
    case "unavailable":
      return `${name} can't be connected yet.`;
    case "busy":
      return "Too many connection attempts in a short time. Please wait a few minutes and try again.";
    default:
      return `Something went wrong connecting ${name}. Please try again.`;
  }
}

/** Link that starts the connect flow and comes back to `returnTo`. */
export const connectHref = (platform: PlatformId, returnTo: "/onboarding/connect" | "/settings") =>
  `/api/connect/${platform}/start?returnTo=${encodeURIComponent(returnTo)}`;
