"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/components/icons/Icon";
import type { ImportOutcome } from "@/app/actions/sync";
import { PLATFORM_ORDER, type PlatformId } from "@/lib/data/types";
import { PLATFORM_NAMES } from "@/lib/platforms";
import s from "./Onboarding.module.css";

const MESSAGE: Record<ImportOutcome, string> = {
  imported: "History imported",
  "not-yet": "Connected. Its numbers arrive in a coming update.",
  reconnect: "Access expired. Reconnect it from Settings.",
  failed: "Couldn't import yet. We'll try again in tonight's sync.",
};

/**
 * Runs the first import for each platform passed in ?p=. Imports report no
 * progress of their own, so each bar eases toward 90% while it waits and
 * completes when the import does.
 */
export function SyncProgress({ onImport }: { onImport: (platform: PlatformId) => Promise<ImportOutcome> }) {
  const search = useSearchParams();
  const ids = useMemo(() => (search.get("p") ?? "").split(",").filter((x): x is PlatformId => PLATFORM_ORDER.includes(x as PlatformId)), [search]);
  const [outcome, setOutcome] = useState<Partial<Record<PlatformId, ImportOutcome>>>({});
  const [pct, setPct] = useState<Partial<Record<PlatformId, number>>>({});
  const started = useRef(false);

  useEffect(() => {
    // once per page view (effects run twice in development)
    if (started.current) return;
    started.current = true;
    for (const id of ids) {
      onImport(id)
        .catch((): ImportOutcome => "failed")
        .then((o) => setOutcome((prev) => ({ ...prev, [id]: o })));
    }
  }, [ids, onImport]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setInterval(() => setPct((prev) => Object.fromEntries(ids.map((id) => [id, reduce ? 60 : Math.min(90, (prev[id] ?? 0) + (90 - (prev[id] ?? 0)) * 0.06)]))), 200);
    return () => window.clearInterval(t);
  }, [ids]);

  const done = ids.every((id) => outcome[id]);

  return (
    <div className={s.flow}>
      <ul className={s.platforms}>
        {ids.map((id, i) => {
          const o = outcome[id];
          const v = o ? 100 : (pct[id] ?? 0);
          return (
            <li key={id} aria-label={PLATFORM_NAMES[id]} className={`${s.pRow} ${o && o !== "imported" ? s.warn : ""} glass rim reveal`} style={{ "--i": i + 2 } as CSSProperties}>
              <div className={s.pMain}>
                <span className={s.pDot} style={{ background: `var(--p-${id})` }} aria-hidden="true">
                  {PLATFORM_NAMES[id][0]}
                </span>
                <span className={s.pText}>
                  <b>{PLATFORM_NAMES[id]}</b>
                  <small role="status">{o ? MESSAGE[o] : "Importing recent history…"}</small>
                </span>
                {o === "imported" && (
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
          {!ids.length ? "Nothing to import yet." : done ? "Your dashboard is ready." : "This usually takes under a minute. You can leave this page open."}
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
