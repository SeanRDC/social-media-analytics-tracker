import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import { getDataSource } from "@/lib/data/api";
import type { DataSource } from "@/lib/data/live";
import { requireUser } from "@/lib/dal";
import { Header } from "./Header";
import { RangeProvider } from "./RangeProvider";
import { TabBar } from "./TabBar";
import { TopNav, TopNavSkeleton } from "./TopNav";
import s from "./AppShell.module.css";

/**
 * The tab bar and a navbar placeholder paint instantly as the static shell.
 * Everything that depends on who is signed in streams in behind Suspense.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <RangeProvider>
      <Suspense fallback={<ShellLoading />}>
        <SignedIn>{children}</SignedIn>
      </Suspense>
      <TabBar />
    </RangeProvider>
  );
}

async function SignedIn({ children }: { children: ReactNode }) {
  const [user, source] = await Promise.all([requireUser(), getDataSource()]);
  return (
    <>
      <TopNav accountName={user.name} />
      <main className={s.main}>
        <Header accountName={user.name} />
        {source !== "live" && (
          <p className={s.notice}>
            <span className={s.noticeIcon}>
              <Icon name="sparkle" size={14} />
            </span>
            <span>{NOTICE[source]}</span>
            <Link href="/settings">Connected accounts</Link>
          </p>
        )}
        {children}
      </main>
    </>
  );
}

const NOTICE: Record<Exclude<DataSource, "live">, string> = {
  sample: "You're looking at sample data. Your own numbers appear here once your platforms are connected and imported.",
  simulated: "Some accounts are simulated locally, so their numbers are generated. Add platform credentials to import real ones.",
};

function ShellLoading() {
  return (
    <>
      <TopNavSkeleton />
      <main className={s.main}>
        <div className={s.loading} role="status" aria-label="Loading your dashboard">
          <span className={s.skHead} />
          <div className={s.skGrid}>
            <span className={s.sk} />
            <span className={s.sk} />
            <span className={s.sk} />
          </div>
          <span className={`${s.sk} ${s.skWide}`} />
        </div>
      </main>
    </>
  );
}
