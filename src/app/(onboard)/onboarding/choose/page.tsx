import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { chooseAccount } from "@/app/actions/connections";
import s from "@/components/onboarding/Onboarding.module.css";
import { PICK_COOKIE, readChoice } from "@/lib/connect/flow";
import { requireUser } from "@/lib/dal";
import { PLATFORM_NAMES } from "@/lib/platforms";

export const metadata: Metadata = { title: "Choose a Page" };

/** After connecting a login that manages several Pages: pick the one to track. */
export default function ChoosePage() {
  return (
    <main className={`${s.card} card reveal`}>
      {/* reads the session and the pending choice, both only known per request */}
      <Suspense fallback={<p className={s.fine}>Loading your Pages…</p>}>
        <Choose />
      </Suspense>
    </main>
  );
}

async function Choose() {
  const user = await requireUser();
  const choice = readChoice((await cookies()).get(PICK_COOKIE)?.value, user.id);

  if (!choice) {
    return (
      <>
        <span className={s.step}>Choose a Page</span>
        <h1 className={s.h1}>This choice has expired</h1>
        <p className={s.sub}>For your security it only lasts 10 minutes. Connect the platform again to pick a Page.</p>
        <Link href="/settings" className={s.primary}>
          Back to Settings
        </Link>
      </>
    );
  }

  const name = PLATFORM_NAMES[choice.platform];
  const noun = choice.platform === "instagram" ? "account" : "Page";
  return (
    <>
      <span className={s.step}>{name}</span>
      <h1 className={s.h1}>Which {noun} should we track?</h1>
      <p className={s.sub}>
        You manage more than one. Pick the {noun} you want in your dashboard. You can switch later by disconnecting {name} in Settings and connecting it again.
      </p>
      <form action={chooseAccount} className={s.form}>
        {choice.options.map((o) => (
          <button key={o.externalId} type="submit" name="externalId" value={o.externalId} className={s.secondary}>
            {o.name}
          </button>
        ))}
      </form>
      <Link href={choice.returnTo} className={s.fine}>
        Cancel
      </Link>
    </>
  );
}
