import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import s from "@/components/legal/Legal.module.css";
import { LegalNav } from "@/components/legal/LegalNav";
import { APP_NAME } from "@/lib/brand";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className={s.page}>
      <header className={s.top}>
        <Link href="/" className={s.brand}>
          <span className={s.logo}>
            <Icon name="logo" size={18} strokeWidth={2.2} />
          </span>
          {APP_NAME}
        </Link>
        <LegalNav />
      </header>
      {children}
    </div>
  );
}
