"use client";

import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { RANGE_OPTIONS, useRange } from "./RangeProvider";
import { SegmentedControl } from "./SegmentedControl";
import { showsRange, titleFor } from "./nav";
import s from "./Header.module.css";

export function Header({ accountName }: { accountName: string }) {
  const pathname = usePathname();
  const { range, setRange } = useRange();
  const title = titleFor(pathname);

  return (
    <header className={`${s.hd} reveal`}>
      <div className={s.titles}>
        <span className={s.acct}>{accountName}</span>
        <h1 className={s.title}>{title}</h1>
      </div>
      {showsRange(pathname) && (
        <SegmentedControl label="Date range" options={RANGE_OPTIONS} value={range} onChange={setRange} className={s.range} />
      )}
      <button type="button" className={s.ib} aria-label="Messages">
        <Icon name="mail" size={16} />
      </button>
      <button type="button" className={s.ib} aria-label="Search">
        <Icon name="search" size={16} />
      </button>
      <Avatar size={34} label={`${accountName} account`} />
    </header>
  );
}
