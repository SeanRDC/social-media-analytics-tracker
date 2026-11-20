import type { Metadata } from "next";
import { Suspense } from "react";
import { SignedIn } from "@/components/onboarding/SignedIn";
import s from "@/components/onboarding/Onboarding.module.css";

export const metadata: Metadata = { title: "Signed in" };

/** Where the email sign-in link lands (in a new tab): hands over to the waiting tab, or carries on here. */
export default function SignedInPage() {
  return (
    <main className={`${s.card} card reveal`}>
      {/* reads ?next= from the URL, which is only known per request */}
      <Suspense fallback={<p className={s.fine}>Signing you in…</p>}>
        <SignedIn />
      </Suspense>
    </main>
  );
}
