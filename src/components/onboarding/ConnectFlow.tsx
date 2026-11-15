"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import type { PlatformId } from "@/lib/data/types";
import s from "./Onboarding.module.css";

type Step = "idle" | "waiting" | "connected" | "needs-professional";

interface Item {
  id: PlatformId;
  name: string;
}

const HINT: Record<PlatformId, string> = {
  youtube: "Channel views, subscribers and watch time",
  facebook: "Page followers, reach and posts",
  tiktok: "Followers, views and video stats",
  linkedin: "Company page followers and posts",
  instagram: "Needs a Professional account",
  x: "Posts and followers",
};

/**
 * Simulates each platform's approval step. Instagram first comes back asking for a
 * Professional account, the real-world edge case the backend phase must handle.
 */
export function ConnectFlow({ platforms }: { platforms: Item[] }) {
  const router = useRouter();
  const [steps, setSteps] = useState<Record<string, Step>>(Object.fromEntries(platforms.map((p) => [p.id, "idle"])));
  const [helpOpen, setHelpOpen] = useState<string | null>(null);
  const tried = useRef(new Set<string>());
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const connect = (id: PlatformId) => {
    setSteps((st) => ({ ...st, [id]: "waiting" }));
    const firstInstagram = id === "instagram" && !tried.current.has(id);
    tried.current.add(id);
    timers.current.push(
      window.setTimeout(() => {
        setSteps((st) => ({ ...st, [id]: firstInstagram ? "needs-professional" : "connected" }));
        if (!firstInstagram) setHelpOpen((h) => (h === id ? null : h));
      }, 1200),
    );
  };

  const connected = platforms.filter((p) => steps[p.id] === "connected");
  const pct = (connected.length / platforms.length) * 100;

  return (
    <div className={s.flow}>
      <div className={s.progress}>
        <div className={s.progressTop}>
          <span>
            {connected.length} of {platforms.length} connected
          </span>
          <b>{Math.round(pct)}%</b>
        </div>
        <div className={s.bar} role="progressbar" aria-label="Accounts connected" aria-valuenow={connected.length} aria-valuemin={0} aria-valuemax={platforms.length}>
          <i style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
      </div>

      <ul className={s.platforms}>
        {platforms.map((p, i) => {
          const st = steps[p.id];
          return (
            <li key={p.id} aria-label={p.name} className={`${s.pRow} ${st === "needs-professional" ? s.warn : ""} glass rim reveal`} style={{ "--i": i + 2 } as React.CSSProperties}>
              <div className={s.pMain}>
                <span className={s.pDot} style={{ background: `var(--p-${p.id})` }} aria-hidden="true">
                  {p.name[0]}
                </span>
                <span className={s.pText}>
                  <b>{p.name}</b>
                  <small>{st === "needs-professional" ? "Instagram only shares stats for Professional accounts." : HINT[p.id]}</small>
                </span>
                {st === "idle" && (
                  <button type="button" className={s.connectBtn} aria-label={`Connect ${p.name}`} onClick={() => connect(p.id)}>
                    Connect
                  </button>
                )}
                {st === "waiting" && (
                  <span className={s.waiting} role="status">
                    <span className={s.spinner} aria-hidden="true" />
                    Waiting for {p.name}…
                  </span>
                )}
                {st === "connected" && (
                  <span className={s.done} role="status">
                    <span className={s.check} aria-hidden="true">
                      <Icon name="check" size={13} strokeWidth={2.2} />
                    </span>
                    Connected
                  </span>
                )}
                {st === "needs-professional" && (
                  <button type="button" className={s.helpBtn} aria-expanded={helpOpen === p.id} onClick={() => setHelpOpen((h) => (h === p.id ? null : p.id))}>
                    How to switch
                  </button>
                )}
              </div>
              {st === "needs-professional" && helpOpen === p.id && (
                <div className={s.help}>
                  <ol>
                    <li>Open Instagram and go to your profile.</li>
                    <li>Tap the menu, then Settings and privacy, then Account type and tools.</li>
                    <li>Tap Switch to professional account and pick Creator or Business.</li>
                    <li>Link it to a Facebook Page when asked.</li>
                  </ol>
                  <button type="button" className={s.connectBtn} onClick={() => connect(p.id)}>
                    I&apos;ve switched, try again
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className={s.footer}>
        <button
          type="button"
          className={s.primary}
          disabled={connected.length === 0}
          onClick={() => router.push(`/onboarding/sync?p=${connected.map((c) => c.id).join(",")}`)}
        >
          Continue
        </button>
        <p className={s.fine}>{connected.length === 0 ? "Connect at least one account to continue. You can add the rest later." : "You can add the rest later from Settings."}</p>
      </div>
    </div>
  );
}
