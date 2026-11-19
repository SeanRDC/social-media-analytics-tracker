import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { deleteAccount } from "@/app/actions/account";
import { agreeToTerms } from "@/app/actions/consent";
import { PrivacyText } from "@/components/legal/PrivacyText";
import { TermsText } from "@/components/legal/TermsText";
import { AgreementForm } from "@/components/onboarding/AgreementForm";
import s from "@/components/onboarding/Onboarding.module.css";
import { DeleteAccount } from "@/components/settings/DeleteAccount";
import { SignOutButton } from "@/components/settings/SignOutButton";
import { APP_NAME } from "@/lib/brand";
import { hasAgreed, requireSignedInUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Before you start" };

/** Shown after the first sign-in (and after the terms change) until the person agrees. */
export default function WelcomePage() {
  return (
    <main className={`${s.card} ${s.wide} card reveal`}>
      <span className={s.step}>Before you start</span>
      <h1 className={s.h1}>Review our terms</h1>
      <p className={s.sub}>
        {APP_NAME} only reads your statistics and never posts for you. Please read the Terms of Service and Privacy Policy, then tick the box to continue.
      </p>
      {/* reads the session, which is only known per request */}
      <Suspense>
        <Agreement />
      </Suspense>
    </main>
  );
}

async function Agreement() {
  const user = await requireSignedInUser();
  if (await hasAgreed(user.id)) redirect("/overview");
  return (
    <>
      <AgreementForm terms={<TermsText />} privacy={<PrivacyText />} onAgree={agreeToTerms} />
      <div className={s.leave}>
        <p>
          Don&apos;t agree? Signing in as <b>{user.email}</b> created an account. You can sign out, or delete it and everything with it.
        </p>
        <div className={s.leaveActions}>
          <SignOutButton />
          <DeleteAccount email={user.email} onDelete={deleteAccount} />
        </div>
      </div>
    </>
  );
}
