import type { PlatformId } from "./data/types";

export const PLATFORM_NAMES: Record<PlatformId, string> = {
  youtube: "YouTube",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  instagram: "Instagram",
};

export const platformColor = (id: PlatformId) => `var(--p-${id})`;
