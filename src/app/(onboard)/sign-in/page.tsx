import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/onboarding/SignInForm";
import s from "@/components/onboarding/Onboarding.module.css";
import { enabledProviders, reviewerSignIn } from "@/lib/auth-providers";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <main className={`${s.card} card reveal`}>
      <span className={s.step}>Step 1 of 3</span>
      <h1 className={s.h1}>Sign in to see every channel in one place</h1>
      <p className={s.sub}>We&apos;ll email you a one-time link. No password to remember.</p>
      <Suspense>
        <Deleted searchParams={searchParams} />
      </Suspense>
      {/* reads ?next= from the URL, which is only known per request */}
      <Suspense>
        <SignInForm providers={enabledProviders} reviewer={reviewerSignIn} />
      </Suspense>
    </main>
  );
}

/** Confirms a deleted account after the redirect from Settings. */
async function Deleted({ searchParams }: Pick<PageProps<"/sign-in">, "searchParams">) {
  const { deleted } = await searchParams;
  if (deleted !== "1") return null;
  return (
    <p className={s.fine} role="status">
      Your account and everything we stored have been deleted.
    </p>
  );
}
