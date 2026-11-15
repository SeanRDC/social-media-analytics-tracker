import type { Metadata } from "next";
import { ConnectFlow } from "@/components/onboarding/ConnectFlow";
import s from "@/components/onboarding/Onboarding.module.css";
import { getConnections } from "@/lib/data/api";

export const metadata: Metadata = { title: "Connect accounts" };

export default async function ConnectPage() {
  const platforms = (await getConnections()).map(({ id, name }) => ({ id, name }));
  return (
    <main className={`${s.card} glass rim reveal`}>
      <span className={s.step}>Step 2 of 3</span>
      <h1 className={s.h1}>Connect your accounts</h1>
      <p className={s.sub}>We only read your stats. We never post for you, and you can disconnect at any time.</p>
      <ConnectFlow platforms={platforms} />
    </main>
  );
}
