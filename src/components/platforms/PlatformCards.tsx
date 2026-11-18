"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { Sparkline } from "@/components/charts/Sparkline";
import { Icon } from "@/components/icons/Icon";
import { CountUp } from "@/components/motion/CountUp";
import { useRange } from "@/components/shell/RangeProvider";
import type { Platform } from "@/lib/data/types";
import { formatCompact, formatPercent, formatSigned } from "@/lib/format";
import s from "./Platforms.module.css";

export function PlatformCards({ platforms }: { platforms: Platform[] }) {
  const { range } = useRange();
  return (
    <ul className={s.cards} aria-label="Platforms">
      {platforms.map((p, i) => {
        const style = { "--i": i, "--pc": `var(--p-${p.id})` } as CSSProperties;
        if (p.status !== "connected") {
          return (
            <li key={p.id} className={`${s.pcard} ${s.pending} card reveal`} style={style}>
              <div className={s.pTop}>
                <span className={s.mark} aria-hidden="true">
                  <Icon name="plus" size={18} />
                </span>
                <span className={s.pName}>{p.name}</span>
                <span className={s.badge}>Not connected</span>
              </div>
              <p className={s.pendingText}>Connect {p.name} to see its followers and posts next to the others.</p>
              <Link href="/onboarding/connect" className={s.connect}>
                <Icon name="plus" size={15} /> Connect {p.name}
              </Link>
            </li>
          );
        }
        return (
          <li key={p.id} className={`${s.pcard} card lift reveal`} style={style}>
            <Link href={`/platforms/${p.id}`} className={s.cover} aria-label={`${p.name}: ${formatCompact(p.followers)} ${p.followerNoun}, open details`} />
            <div className={s.pTop}>
              <span className={s.mark} aria-hidden="true">
                {p.name.charAt(0)}
              </span>
              <span className={s.who}>
                <span className={s.pName}>{p.name}</span>
                <span className={s.acct}>{p.account}</span>
              </span>
              <span className={s.go} aria-hidden="true">
                <Icon name="arrow" size={15} />
              </span>
            </div>
            <div className={s.pNum}>
              <CountUp value={formatCompact(p.followers)} delay={300} className={s.pBig} />
              <span className={s.pNoun}>{p.followerNoun}</span>
            </div>
            <Sparkline values={p.trend} color="var(--pc)" height={48} label={`${p.name} followers over the last 30 days, rising to ${formatCompact(p.followers)}`} />
            <dl className={s.pStats}>
              <div>
                <dt>{range}-day growth</dt>
                <dd className="up">{formatSigned(p.followerGrowth[range])}</dd>
              </div>
              <div>
                <dt>Engagement</dt>
                <dd>{formatPercent(p.engagement)}</dd>
              </div>
              <div>
                <dt>Posts · 30d</dt>
                <dd>{p.posts30}</dd>
              </div>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
