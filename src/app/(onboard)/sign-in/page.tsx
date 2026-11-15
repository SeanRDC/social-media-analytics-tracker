import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/onboarding/SignInForm";
import s from "@/components/onboarding/Onboarding.module.css";
import { enabledProviders } from "@/lib/auth-providers";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <main className={`${s.card} glass rim reveal`}>
      <span className={s.step}>Step 1 of 3</span>
      <h1 className={s.h1}>Sign in to see every channel in one place</h1>
      <p className={s.sub}>We&apos;ll email you a one-time link. No password to remember.</p>
      {/* reads ?next= from the URL, which is only known per request */}
      <Suspense>
        <SignInForm providers={enabledProviders} />
      </Suspense>
    </main>
  );
}
