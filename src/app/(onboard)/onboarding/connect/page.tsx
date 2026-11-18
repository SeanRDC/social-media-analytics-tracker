import type { Metadata } from "next";
import { Suspense } from "react";
import { ConnectFlow } from "@/components/onboarding/ConnectFlow";
import s from "@/components/onboarding/Onboarding.module.css";
import { parseConnectResult } from "@/lib/connect/result";
import { getMyConnections } from "@/lib/data/connections";

export const metadata: Metadata = { title: "Connect accounts" };

export default function ConnectPage({ searchParams }: PageProps<"/onboarding/connect">) {
  return (
    <main className={`${s.card} card reveal`}>
      <span className={s.step}>Step 2 of 3</span>
      <h1 className={s.h1}>Connect your accounts</h1>
      <p className={s.sub}>We only read your stats. We never post for you, and you can disconnect at any time.</p>
      {/* reads the session and the ?connect= result, both only known per request */}
      <Suspense fallback={<p className={s.fine}>Loading your accounts…</p>}>
        <Connect searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Connect({ searchParams }: Pick<PageProps<"/onboarding/connect">, "searchParams">) {
  const [platforms, params] = await Promise.all([getMyConnections(), searchParams]);
  return <ConnectFlow platforms={platforms} result={parseConnectResult(params)} />;
}
