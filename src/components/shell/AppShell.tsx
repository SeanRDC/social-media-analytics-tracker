import type { ReactNode } from "react";
import { getAccount } from "@/lib/data/api";
import { Header } from "./Header";
import { Rail } from "./Rail";
import { RangeProvider } from "./RangeProvider";
import { TabBar } from "./TabBar";
import s from "./AppShell.module.css";

export async function AppShell({ children }: { children: ReactNode }) {
  const account = await getAccount();
  return (
    <RangeProvider>
      <div className={`${s.frame} rim`}>
        <div className={s.railCol}>
          <Rail />
        </div>
        <main className={s.main}>
          <Header accountName={account.name} />
          {children}
        </main>
      </div>
      <TabBar />
    </RangeProvider>
  );
}
