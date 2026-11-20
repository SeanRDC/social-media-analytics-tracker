import type { MetadataRoute } from "next";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

/**
 * Makes Ispector installable ("Install app" in Chrome and Edge, "Add to Home
 * Screen" on phones). Chrome needs PNG icons at 192 and 512 pixels; the logo
 * sits inside the safe zone, so the same images work as maskable icons.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/overview",
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_TAGLINE,
    start_url: "/overview",
    scope: "/",
    display: "standalone",
    background_color: "#f3f2ee",
    theme_color: "#f3f2ee",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
