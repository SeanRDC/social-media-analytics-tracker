import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import { getDataSource } from "@/lib/data/api";
import type { DataSource } from "@/lib/data/live";
import { requireUser } from "@/lib/dal";
import { Header } from "./Header";
import { Rail } from "./Rail";
import { RangeProvider } from "./RangeProvider";
import { TabBar } from "./TabBar";
import s from "./AppShell.module.css";

/**
 * The frame (rail, tab bar) renders instantly as part of the static shell.
 * Everything that depends on who is signed in streams in behind Suspense.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <RangeProvider>
      <div className={s.frame}>
        <div className={s.railCol}>
          <Rail />
        </div>
        <main className={s.main}>
          <Suspense fallback={<ShellLoading />}>
            <SignedIn>{children}</SignedIn>
          </Suspense>
        </main>
      </div>
      <TabBar />
    </RangeProvider>
  );
}

async function SignedIn({ children }: { children: ReactNode }) {
  const [user, source] = await Promise.all([requireUser(), getDataSource()]);
  return (
    <>
      <Header accountName={user.name} />
      {source !== "live" && (
        <p className={s.notice}>
          <Icon name="sparkle" size={14} />
          <span>{NOTICE[source]}</span>
          <Link href="/settings">Connected accounts</Link>
        </p>
      )}
      {children}
    </>
  );
}

const NOTICE: Record<Exclude<DataSource, "live">, string> = {
  sample: "You're looking at sample data. Your own numbers appear here once your platforms are connected and imported.",
  simulated: "Some accounts are simulated locally, so their numbers are generated. Add platform credentials to import real ones.",
};

function ShellLoading() {
  return (
    <div className={s.loading} role="status" aria-label="Loading your dashboard">
      <span className={s.skHead} />
      <div className={s.skGrid}>
        <span className={`${s.sk} ${s.skHero}`} />
        <span className={s.sk} />
        <span className={s.sk} />
      </div>
      <span className={`${s.sk} ${s.skWide}`} />
    </div>
  );
}
