"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { announceSignIn, safeNext } from "@/lib/auth-tabs";
import s from "./Onboarding.module.css";

/**
 * The tab the email link opened. If the "check your email" tab is still open
 * in this browser, it carries on there and this tab says it can be closed.
 * Otherwise (no waiting tab, e.g. the email was opened on a phone) this tab
 * carries on itself.
 */
export function SignedIn({ announce = announceSignIn }: { announce?: () => Promise<boolean> }) {
  const next = safeNext(useSearchParams().get("next"));
  const [handedOver, setHandedOver] = useState(false);

  useEffect(() => {
    let live = true;
    void announce().then((answered) => {
      if (!live) return;
      if (answered) setHandedOver(true);
      else window.location.replace(next);
    });
    return () => {
      live = false;
    };
  }, [announce, next]);

  if (!handedOver) {
    return (
      <p className={s.sub} role="status">
        Signing you in…
      </p>
    );
  }

  return (
    <div className={s.form} role="status">
      <span className={s.check} style={{ width: 44, height: 44 }} aria-hidden="true">
        <Icon name="check" size={20} strokeWidth={2.2} />
      </span>
      <h1 className={s.h1} style={{ fontSize: 26 }}>
        You&apos;re signed in
      </h1>
      <p className={s.sub}>Your other Ispector tab has carried on. You can close this one.</p>
      <a href={next} className={s.secondary}>
        Continue in this tab instead
      </a>
    </div>
  );
}
