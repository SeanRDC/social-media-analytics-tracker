"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";
import { Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { useLiquidIndicator } from "@/hooks/useLiquidIndicator";
import { APP_NAME } from "@/lib/brand";
import { getNotifications, readAllNotifications, readNotification } from "@/app/actions/notifications";
import { LiquidRefraction } from "./LiquidRefraction";
import { MAIN_NAV, isActive } from "./nav";
import { NotificationBell } from "./NotificationBell";
import s from "./TopNav.module.css";

/**
 * Floating dark navbar: brand on the left, sections grouped in an inset pill,
 * shortcuts and the account button on the right. On phones only the brand and
 * avatar stay; the bottom tab bar carries the sections. On iPhone and iPad the
 * bar is Liquid Glass and the section pill moves like iOS tabs (useLiquidIndicator).
 */
export function TopNav({ accountName, image = null, unread = 0 }: { accountName: string; image?: string | null; unread?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = MAIN_NAV.find((n) => isActive(pathname, n.href))?.href ?? null;
  const { container, indicator, active, handlers } = useLiquidIndicator(current, (href) => router.push(href));
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
      <div className={`${s.bar} liquid-glass`}>
        <LiquidRefraction />
        <Link href="/overview" className={s.brand} aria-label={`${APP_NAME} home`}>
          <span className={s.logo}>
            <Icon name="logo" size={18} strokeWidth={2.2} />
          </span>
          <span className={s.name} aria-hidden="true">
            {APP_NAME}
          </span>
        </Link>

        <nav className={s.navCol} aria-label="Main">
          <div ref={container} className={s.links} onPointerLeave={hideHover} {...handlers}>
            <span ref={hover} className={s.hover} aria-hidden="true" />
            <span ref={indicator} className={`${s.ind} liquid-lens`} aria-hidden="true">
              <span className="liquid-lens-base" />
              <span className="liquid-lens-glass" />
            </span>
            {MAIN_NAV.map((n) => {
              const on = n.href === active;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={s.link}
                  data-key={n.href}
                  data-active={on}
                  aria-current={n.href === current ? "page" : undefined}
                  draggable={false}
                  onPointerEnter={(e) => showHover(e.currentTarget)}
                  onFocus={(e) => showHover(e.currentTarget)}
                  onBlur={hideHover}
                >
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className={s.end}>
          <NotificationBell initialUnread={unread} load={getNotifications} onRead={readNotification} onReadAll={readAllNotifications} />
          <Link href="/settings" className={s.ib} data-active={settingsOn} aria-current={settingsOn ? "page" : undefined}>
            <Icon name="gear" size={18} />
            <span className="sr-only">Settings</span>
          </Link>
          <Link href="/settings" className={s.account} aria-label={`Account: ${accountName}`}>
            <Avatar size={30} src={image} />
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
      <div className={`${s.bar} liquid-glass`} />
    </div>
  );
}
