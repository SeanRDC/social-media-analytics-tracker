"use client";

import { ErrorCard } from "@/components/errors/ErrorCard";
import s from "@/components/onboarding/Onboarding.module.css";

/** A public page (home, sign-in, legal, onboarding) failed. */
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className={s.page} style={{ justifyContent: "center" }}>
      <ErrorCard error={error} retry={retry} home={{ href: "/", label: "Go to the home page" }} />
    </div>
  );
}
