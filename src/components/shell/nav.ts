import type { IconName } from "@/components/icons/Icon";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

/** Sections in the top navbar (desktop and tablet). */
export const MAIN_NAV: NavItem[] = [
  { href: "/overview", label: "Overview", icon: "home" },
  { href: "/platforms", label: "Platforms", icon: "grid" },
  { href: "/content", label: "Content", icon: "play" },
  { href: "/audience", label: "Audience", icon: "users" },
  { href: "/reports", label: "Reports", icon: "chart" },
];

/**
 * Phone tab bar: the same five sections as the navbar.
 * Settings is reached from the avatar in the top bar.
 */
export const TAB_NAV: NavItem[] = MAIN_NAV;

const TITLES: [string, string][] = [
  ["/overview", "Channel Analytics"],
  ["/platforms", "Platforms"],
  ["/content", "Content"],
  ["/audience", "Audience"],
  ["/reports", "Reports"],
  ["/settings", "Settings"],
];

/** Pages where the 7D / 30D / 90D switch applies. */
const RANGE_PAGES = ["/overview", "/platforms", "/content"];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function titleFor(pathname: string): string {
  return TITLES.find(([href]) => isActive(pathname, href))?.[1] ?? "";
}

export function showsRange(pathname: string): boolean {
  return RANGE_PAGES.some((href) => isActive(pathname, href));
}
