import type { ConnectMode, PlatformId } from "@/lib/data/types";
import { facebookCredentials, facebookProvider } from "./facebook";
import { instagramCredentials, instagramProvider } from "./instagram";
import { linkedinCredentials, linkedinProvider } from "./linkedin";
import { simulatedProvider } from "./simulated";
import { tiktokCredentials, tiktokProvider } from "./tiktok";
import type { Provider } from "./types";
import { youtubeCredentials, youtubeProvider } from "./youtube";

type Creds = { clientId: string; clientSecret: string };

/** Platforms that can be connected. */
const REGISTRY: Partial<Record<PlatformId, { credentials: () => Creds | null; create: (c: Creds) => Provider }>> = {
  youtube: { credentials: youtubeCredentials, create: youtubeProvider },
  facebook: { credentials: facebookCredentials, create: facebookProvider },
  tiktok: { credentials: tiktokCredentials, create: tiktokProvider },
  linkedin: { credentials: linkedinCredentials, create: linkedinProvider },
  instagram: { credentials: instagramCredentials, create: instagramProvider },
};

/** Simulation runs outside production unless CONNECT_SIMULATION=off. */
const simulationAllowed = () => process.env.NODE_ENV !== "production" && process.env.CONNECT_SIMULATION !== "off";

export function resolveProvider(platform: string): { provider: Provider; mode: "live" | "simulated" } | null {
  const entry = REGISTRY[platform as PlatformId];
  if (!entry) return null;
  const creds = entry.credentials();
  if (creds) return { provider: entry.create(creds), mode: "live" };
  if (simulationAllowed()) return { provider: simulatedProvider(platform as PlatformId), mode: "simulated" };
  return null;
}

export function connectMode(platform: PlatformId): ConnectMode {
  return resolveProvider(platform)?.mode ?? "unavailable";
}

export type { ConnectMode };
export { ProviderError, RateLimited, ReauthRequired, type AccountResult, type Provider, type TokenSet } from "./types";
