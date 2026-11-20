"use client";

import Link from "next/link";
import { useEffect } from "react";
import s from "@/components/onboarding/Onboarding.module.css";

/** The server's reference for an error (matches the server log), when there is one. */
const digestOf = (error: unknown) => (error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : null);

/**
 * What people see when a page breaks: what happened in plain words, a way to
 * try again, a way out, and a reference that matches the server log.
 */
export function ErrorCard({ error, retry, home }: { error: unknown; retry: () => void; home: { href: string; label: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const ref = digestOf(error);

  return (
    <main className={`${s.card} card reveal`}>
      <span className={s.step}>Something went wrong</span>
      <h1 className={s.h1}>This page didn&apos;t load</h1>
      <p className={s.sub}>It&apos;s usually a short hiccup on our side or at one of the platforms. Your data is safe. Try again, or come back in a minute.</p>
      <button type="button" className={s.primary} onClick={retry}>
        Try again
      </button>
      <Link href={home.href} className={s.secondary}>
        {home.label}
      </Link>
      {ref && <p className={s.fine}>Reference: {ref}</p>}
    </main>
  );
}
