"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "./Legal.module.css";

const LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/data-deletion", label: "Data deletion" },
];

export function LegalNav() {
  const pathname = usePathname();
  return (
    <nav className={s.links} aria-label="Legal">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
