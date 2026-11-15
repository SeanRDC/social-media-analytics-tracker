import type { Metadata } from "next";
import { SignInForm } from "@/components/onboarding/SignInForm";
import s from "@/components/onboarding/Onboarding.module.css";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <main className={`${s.card} glass rim reveal`}>
      <span className={s.step}>Step 1 of 3</span>
      <h1 className={s.h1}>Sign in to see every channel in one place</h1>
      <p className={s.sub}>New here? Signing in creates your account.</p>
      <SignInForm />
    </main>
  );
}
