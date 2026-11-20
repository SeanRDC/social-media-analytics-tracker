import type { Metadata, Viewport } from "next";
import { Geist, Urbanist } from "next/font/google";
import { APP_NAME, APP_TAGLINE, SITE_URL } from "@/lib/brand";
import { ServiceWorker } from "@/components/pwa/ServiceWorker";
import { THEME_BG, THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const urbanist = Urbanist({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_TAGLINE,
  applicationName: APP_NAME,
  // the preview card shown when a link is shared (the image is app/opengraph-image.tsx)
  openGraph: { type: "website", siteName: APP_NAME, title: `${APP_NAME} · Every channel, one calm dashboard`, description: APP_TAGLINE, url: "/" },
  twitter: { card: "summary_large_image", title: `${APP_NAME} · Every channel, one calm dashboard`, description: APP_TAGLINE },
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEME_BG.light,
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // the theme script sets data-theme before React hydrates, so the attribute is allowed to differ
    <html lang="en" data-theme="light" className={`${geist.variable} ${urbanist.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
