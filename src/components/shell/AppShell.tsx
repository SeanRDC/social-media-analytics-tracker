import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import { getDataSource } from "@/lib/data/api";
import { getDb } from "@/db";
import { requireUser } from "@/lib/dal";
import { unreadCount } from "@/lib/notifications";
import { Header } from "./Header";
import { PullToRefresh } from "./PullToRefresh";
import { RangeProvider } from "./RangeProvider";
import { TabBar } from "./TabBar";
import { TopNav, TopNavSkeleton } from "./TopNav";
import s from "./AppShell.module.css";

/**
 * The tab bar, page title and a navbar placeholder paint instantly as the
 * static shell. The navbar (who is signed in) and the page stream in side by
 * side: the page is never nested under the session check, so moving between
 * pages isn't held up by it. Each page checks the session itself through the
 * Data Access Layer, and the proxy turns away visitors without a session cookie.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <RangeProvider>
      <Suspense fallback={<TopNavSkeleton />}>
        <SignedInNav />
      </Suspense>
      <PullToRefresh className={s.main}>
        <Header />
        <Suspense fallback={null}>
          <SimulatedNotice />
        </Suspense>
        {children}
      </PullToRefresh>
      <TabBar />
    </RangeProvider>
  );
}

async function SignedInNav() {
  const user = await requireUser();
  const unread = await unreadCount(getDb(), user.id).catch(() => 0);
  return <TopNav accountName={user.name} image={user.image} unread={unread} />;
}

async function SimulatedNotice() {
  if ((await getDataSource()) !== "simulated") return null;
  return (
    <p className={s.notice}>
      <span className={s.noticeIcon}>
        <Icon name="sparkle" size={14} />
      </span>
      <span>{SIMULATED_NOTICE}</span>
      <Link href="/settings">Connected accounts</Link>
    </p>
  );
}

const SIMULATED_NOTICE = "Some accounts are simulated locally, so their numbers are generated. Add platform credentials to import real ones.";
