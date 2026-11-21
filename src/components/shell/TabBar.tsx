"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { useLiquidIndicator } from "@/hooks/useLiquidIndicator";
import { LiquidRefraction } from "./LiquidRefraction";
import { TAB_NAV, isActive } from "./nav";
import s from "./TabBar.module.css";

/**
 * Floating tab bar for phones. Hidden from 640px up, where the top navbar takes over.
 * On iPhone it is a Liquid Glass capsule whose selection lifts into a lens (see useLiquidIndicator).
 */
export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const current = TAB_NAV.find((n) => isActive(pathname, n.href))?.href ?? null;
  const { container, indicator, active, handlers } = useLiquidIndicator<HTMLElement>(current, (href) => router.push(href));

  return (
    <nav ref={container} className={`${s.bar} liquid-glass`} aria-label="Tabs" {...handlers}>
      <LiquidRefraction />
      <span ref={indicator} className={`${s.ind} liquid-lens`} aria-hidden="true">
        <span className="liquid-lens-base" />
        <span className="liquid-lens-glass" />
      </span>
      {TAB_NAV.map((n) => {
        const on = n.href === active;
        return (
          <Link
            key={n.href}
            href={n.href}
            className={s.tab}
            data-key={n.href}
            data-active={on}
            aria-current={n.href === current ? "page" : undefined}
            draggable={false}
          >
            <Icon name={n.icon} size={20} />
            <span className={s.label}>{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
