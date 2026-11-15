import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import s from "./ArrowButton.module.css";

interface Props {
  href: string;
  children: ReactNode;
  tone?: "light" | "glass";
  className?: string;
}

/** Pill link with the arrow nested in its own circle; the arrow turns toward its target on hover. */
export function ArrowButton({ href, children, tone = "light", className = "" }: Props) {
  return (
    <Link href={href} className={`${s.btn} ${tone === "glass" ? s.glass : ""} ${className}`}>
      {children}
      <span className={s.arr} aria-hidden="true">
        <Icon name="arrow" size={13} strokeWidth={1.9} />
      </span>
    </Link>
  );
}

/** Round arrow-only link, like the inspiration's stat-strip button. */
export function RoundArrow({ href, label, className = "" }: { href: string; label: string; className?: string }) {
  return (
    <Link href={href} className={`${s.round} ${className}`} aria-label={label}>
      <Icon name="arrow" size={16} strokeWidth={1.7} />
    </Link>
  );
}
