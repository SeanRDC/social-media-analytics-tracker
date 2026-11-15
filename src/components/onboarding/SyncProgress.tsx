"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Icon } from "@/components/icons/Icon";
import type { PlatformId } from "@/lib/data/types";
import { PLATFORM_NAMES } from "@/lib/platforms";
import s from "./Onboarding.module.css";

const ALL: PlatformId[] = ["youtube", "facebook", "tiktok", "linkedin", "instagram", "x"];
/** Simulated import speed per platform, percent per tick. */
const SPEED: Record<PlatformId, number> = { youtube: 6, facebook: 11, tiktok: 8, linkedin: 14, instagram: 9, x: 12 };

export function SyncProgress() {
  const search = useSearchParams();
  const ids = useMemo(() => {
    const asked = (search.get("p") ?? "").split(",").filter((x): x is PlatformId => ALL.includes(x as PlatformId));
    return asked.length ? asked : (["youtube", "tiktok", "instagram"] as PlatformId[]);
  }, [search]);
  const [pct, setPct] = useState<Record<string, number>>({});

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setInterval(
      () => {
        setPct((prev) => {
          const next = { ...prev };
          for (const id of ids) next[id] = reduce ? 100 : Math.min(100, (prev[id] ?? 0) + SPEED[id]);
          return next;
        });
      },
      reduce ? 50 : 160,
    );
    return () => window.clearInterval(t);
  }, [ids]);

  const done = ids.every((id) => (pct[id] ?? 0) >= 100);

  return (
    <div className={s.flow}>
      <ul className={s.platforms}>
        {ids.map((id, i) => {
          const v = pct[id] ?? 0;
          return (
            <li key={id} className={`${s.pRow} glass rim reveal`} style={{ "--i": i + 2 } as CSSProperties}>
              <div className={s.pMain}>
                <span className={s.pDot} style={{ background: `var(--p-${id})` }} aria-hidden="true">
                  {PLATFORM_NAMES[id][0]}
                </span>
                <span className={s.pText}>
                  <b>{PLATFORM_NAMES[id]}</b>
                  <small>{v >= 100 ? "History imported" : `Importing recent history… ${Math.round(v)}%`}</small>
                </span>
                {v >= 100 && (
                  <span className={s.check} aria-hidden="true">
                    <Icon name="check" size={13} strokeWidth={2.2} />
                  </span>
                )}
              </div>
              <div className={s.bar} role="progressbar" aria-label={`${PLATFORM_NAMES[id]} import`} aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
                <i style={{ transform: `scaleX(${v / 100})` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <div className={s.footer}>
        <p className={s.readyText} role="status">
          {done ? "Your dashboard is ready." : "This usually takes under a minute. You can leave this page open."}
        </p>
        {done ? (
          <Link href="/overview" className={`${s.primary} ${s.pop}`}>
            Open dashboard <Icon name="arrow" size={15} strokeWidth={1.8} />
          </Link>
        ) : (
          <span className={`${s.primary} ${s.disabledLink}`} aria-disabled="true">
            Importing…
          </span>
        )}
      </div>
    </div>
  );
}
