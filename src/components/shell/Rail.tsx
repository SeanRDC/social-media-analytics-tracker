"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { useSlidingIndicator } from "@/hooks/useSlidingIndicator";
import { APP_NAME } from "@/lib/brand";
import { RAIL_NAV, isActive } from "./nav";
import s from "./Rail.module.css";

export function Rail() {
  const pathname = usePathname();
  const active = RAIL_NAV.find((n) => isActive(pathname, n.href))?.href ?? null;
  const { container, indicator } = useSlidingIndicator(active);
  const settingsOn = isActive(pathname, "/settings");

  return (
    <nav className={s.rail} aria-label="Main">
      <Link href="/overview" className={s.logo} aria-label={`${APP_NAME} home`}>
        <Icon name="logo" strokeWidth={2} />
      </Link>
      <div ref={container} className={s.nav}>
        <span ref={indicator} className={s.ind} aria-hidden="true" />
        {RAIL_NAV.map((n) => {
          const on = n.href === active;
          return (
            <Link key={n.href} href={n.href} className={s.item} data-active={on} data-tip={n.label} aria-current={on ? "page" : undefined}>
              <Icon name={n.icon} />
              <span className="sr-only">{n.label}</span>
            </Link>
          );
        })}
      </div>
      <div className={s.bottom}>
        <Link href="/settings#alerts" className={s.item} data-tip="Alerts">
          <Icon name="bell" />
          <span className={s.badge} aria-hidden="true" />
          <span className="sr-only">Alerts, 2 new</span>
        </Link>
        <Link href="/settings" className={s.item} data-tip="Settings" data-active={settingsOn} aria-current={settingsOn ? "page" : undefined}>
          <Icon name="gear" />
          <span className="sr-only">Settings</span>
        </Link>
      </div>
    </nav>
  );
}
