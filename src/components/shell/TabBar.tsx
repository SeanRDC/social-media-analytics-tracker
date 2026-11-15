"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { useSlidingIndicator } from "@/hooks/useSlidingIndicator";
import { TAB_NAV, isActive } from "./nav";
import s from "./TabBar.module.css";

/** Floating glass tab bar for phones. Hidden from 640px up, where the rail takes over. */
export function TabBar() {
  const pathname = usePathname();
  const active = TAB_NAV.find((n) => isActive(pathname, n.href))?.href ?? null;
  const { container, indicator } = useSlidingIndicator<HTMLElement>(active);

  return (
    <nav ref={container} className={`${s.bar} glass rim`} aria-label="Tabs">
      <span ref={indicator} className={s.ind} aria-hidden="true" />
      {TAB_NAV.map((n) => {
        const on = n.href === active;
        return (
          <Link key={n.href} href={n.href} className={s.tab} data-active={on} aria-current={on ? "page" : undefined}>
            <Icon name={n.icon} size={20} />
            <span className={s.label}>{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
