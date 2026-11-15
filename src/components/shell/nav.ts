import type { IconName } from "@/components/icons/Icon";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

/** Desktop and tablet rail. */
export const RAIL_NAV: NavItem[] = [
  { href: "/overview", label: "Overview", icon: "home" },
  { href: "/platforms", label: "Platforms", icon: "grid" },
  { href: "/content", label: "Content", icon: "play" },
  { href: "/audience", label: "Audience", icon: "users" },
  { href: "/reports", label: "Reports", icon: "chart" },
];

/** Phone tab bar: five thumb-reachable destinations. */
export const TAB_NAV: NavItem[] = [
  { href: "/overview", label: "Overview", icon: "home" },
  { href: "/platforms", label: "Platforms", icon: "grid" },
  { href: "/content", label: "Content", icon: "play" },
  { href: "/reports", label: "Reports", icon: "chart" },
  { href: "/settings", label: "Profile", icon: "user" },
];

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
