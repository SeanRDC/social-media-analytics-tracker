"use client";

import { usePathname } from "next/navigation";
import { RANGE_OPTIONS, useRange } from "./RangeProvider";
import { SegmentedControl } from "./SegmentedControl";
import { showsRange, titleFor } from "./nav";
import s from "./Header.module.css";

/** Big page title (Ramos-style display type) with the date range on the right. */
export function Header({ accountName }: { accountName: string }) {
  const pathname = usePathname();
  const { range, setRange } = useRange();

  return (
    <header className={`${s.hd} reveal`}>
      <div className={s.titles}>
        <span className={s.acct}>{accountName}</span>
        <h1 className={s.title}>{titleFor(pathname)}</h1>
      </div>
      {showsRange(pathname) && <SegmentedControl label="Date range" options={RANGE_OPTIONS} value={range} onChange={setRange} className={s.range} />}
    </header>
  );
}
