"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { useSlidingIndicator } from "@/hooks/useSlidingIndicator";
import { APP_NAME } from "@/lib/brand";
import { MAIN_NAV, isActive } from "./nav";
import s from "./TopNav.module.css";

/**
 * Floating dark navbar: brand on the left, sections grouped in an inset pill,
 * shortcuts and the account button on the right. On phones only the brand and
 * avatar stay; the bottom tab bar carries the sections.
 */
export function TopNav({ accountName }: { accountName: string }) {
  const pathname = usePathname();
  const active = MAIN_NAV.find((n) => isActive(pathname, n.href))?.href ?? null;
  const { container, indicator } = useSlidingIndicator(active);
  const hover = useRef<HTMLSpanElement>(null);
  const settingsOn = isActive(pathname, "/settings");

  // the hover pill is moved directly so following the pointer never re-renders
  const showHover = (el: HTMLElement) => {
    const h = hover.current;
    if (!h) return;
    h.style.width = `${el.offsetWidth}px`;
    h.style.height = `${el.offsetHeight}px`;
    h.style.transform = `translate(${el.offsetLeft}px, ${el.offsetTop}px)`;
    h.dataset.on = "true";
  };
  const hideHover = () => {
    if (hover.current) hover.current.dataset.on = "false";
  };

  return (
    <header className={s.wrap}>
      <div className={s.bar}>
        <Link href="/overview" className={s.brand} aria-label={`${APP_NAME} home`}>
          <span className={s.logo}>
            <Icon name="logo" size={18} strokeWidth={2.2} />
          </span>
          <span className={s.name} aria-hidden="true">
            {APP_NAME}
          </span>
        </Link>

        <nav className={s.navCol} aria-label="Main">
          <div ref={container} className={s.links} onPointerLeave={hideHover}>
            <span ref={hover} className={s.hover} aria-hidden="true" />
            <span ref={indicator} className={s.ind} aria-hidden="true" />
            {MAIN_NAV.map((n) => {
              const on = n.href === active;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={s.link}
                  data-active={on}
                  aria-current={on ? "page" : undefined}
                  onPointerEnter={(e) => showHover(e.currentTarget)}
                  onFocus={(e) => showHover(e.currentTarget)}
                  onBlur={hideHover}
                >
                  {on && <span className={s.dot} aria-hidden="true" />}
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className={s.end}>
          <Link href="/settings#alerts" className={s.ib}>
            <Icon name="bell" size={18} />
            <span className={s.badge} aria-hidden="true" />
            <span className="sr-only">Alerts, 2 new</span>
          </Link>
          <Link href="/settings" className={s.ib} data-active={settingsOn} aria-current={settingsOn ? "page" : undefined}>
            <Icon name="gear" size={18} />
            <span className="sr-only">Settings</span>
          </Link>
          <Link href="/settings" className={s.account}>
            <Avatar size={30} />
            <span className={s.acctName}>{accountName}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

/** Static stand-in painted with the shell while the session loads. */
export function TopNavSkeleton() {
  return (
    <div className={s.wrap} aria-hidden="true">
      <div className={s.bar} />
    </div>
  );
}
