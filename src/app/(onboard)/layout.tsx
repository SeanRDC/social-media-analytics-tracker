import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import s from "@/components/onboarding/Onboarding.module.css";
import { APP_NAME } from "@/lib/brand";

export default function OnboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className={s.page}>
      <Link href="/" className={s.brand}>
        <span className={s.logo}>
          <Icon name="logo" strokeWidth={2} />
        </span>
        {APP_NAME}
      </Link>
      {children}
    </div>
  );
}
