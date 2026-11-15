import type { Metadata } from "next";
import { Suspense } from "react";
import { SyncProgress } from "@/components/onboarding/SyncProgress";
import s from "@/components/onboarding/Onboarding.module.css";

export const metadata: Metadata = { title: "Importing your data" };

export default function SyncPage() {
  return (
    <main className={`${s.card} glass rim reveal`}>
      <span className={s.step}>Step 3 of 3</span>
      <h1 className={s.h1}>Importing your history</h1>
      <p className={s.sub}>We&apos;re bringing in as much recent history as each platform allows, so your charts don&apos;t start empty. From now on we save a snapshot every day.</p>
      {/* reads ?p= from the URL, which is only known per request */}
      <Suspense>
        <SyncProgress />
      </Suspense>
    </main>
  );
}
