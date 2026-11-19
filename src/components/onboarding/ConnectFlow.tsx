"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { connectHref, connectMessage, type ConnectResult } from "@/lib/connect/result";
import type { ConnectionView, PlatformId } from "@/lib/data/types";
import s from "./Onboarding.module.css";

const HINT: Record<PlatformId, string> = {
  youtube: "Channel views, subscribers and watch time",
  facebook: "Page followers, reach and posts",
  tiktok: "Followers, views and video stats",
  linkedin: "Company page followers and posts",
  instagram: "Professional account linked to a Facebook Page",
  x: "Posts and followers",
};

const RETURN_TO = "/onboarding/connect";

/**
 * Each Connect button leaves for the platform's approval screen and comes back
 * here with ?connect=ok|error. Statuses come from the server.
 */
export function ConnectFlow({ platforms, result }: { platforms: ConnectionView[]; result: ConnectResult | null }) {
  const router = useRouter();
  const [waiting, setWaiting] = useState<PlatformId | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  // coming back with the browser's Back button restores the page from cache: clear the spinner
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => e.persisted && setWaiting(null);
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const available = platforms.filter((p) => p.mode !== "unavailable");
  const connected = available.filter((p) => p.status === "connected");
  const pct = available.length ? (connected.length / available.length) * 100 : 0;

  return (
    <div className={s.flow}>
      <div className={s.progress}>
        <div className={s.progressTop}>
          <span>
            {connected.length} of {available.length} connected
          </span>
          <b>{Math.round(pct)}%</b>
        </div>
        <div className={s.bar} role="progressbar" aria-label="Accounts connected" aria-valuenow={connected.length} aria-valuemin={0} aria-valuemax={available.length}>
          <i style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
      </div>

      <ul className={s.platforms}>
        {platforms.map((p, i) => {
          const mine = result?.platform === p.id ? result : null;
          const needsPro = !!mine && mine.reason === "needs-professional";
          const failed = mine && !mine.ok && !needsPro ? connectMessage(mine) : null;
          const href = connectHref(p.id, RETURN_TO);
          const hint = needsPro ? connectMessage(mine) : p.status === "connected" ? p.account : p.status === "expired" ? "Access expired. Reconnect to keep your stats updating." : HINT[p.id];
          return (
            <li key={p.id} aria-label={p.name} className={`${s.pRow} ${needsPro || p.status === "expired" ? s.warn : ""} card reveal`} style={{ "--i": i + 2 } as React.CSSProperties}>
              <div className={s.pMain}>
                <span className={s.pDot} style={{ background: `var(--p-${p.id})` }} aria-hidden="true">
                  {p.name[0]}
                </span>
                <span className={s.pText}>
                  <b>{p.name}</b>
                  <small>
                    {hint}
                    {p.mode === "simulated" && p.status !== "connected" && " · Simulated locally"}
                  </small>
                </span>
                <RowEnd p={p} href={href} waiting={waiting === p.id} needsPro={needsPro} helpOpen={helpOpen} onWait={() => setWaiting(p.id)} onHelp={() => setHelpOpen((h) => !h)} />
              </div>
              {failed && (
                <p className={s.error} role="alert">
                  {failed}
                </p>
              )}
              {needsPro && helpOpen && (
                <div className={s.help}>
                  <ol>
                    <li>Open Instagram and go to your profile.</li>
                    <li>Tap the menu, then Settings and privacy, then Account type and tools.</li>
                    <li>Tap Switch to professional account and pick Creator or Business.</li>
                  </ol>
                  <a href={href} className={s.connectBtn} onClick={() => setWaiting(p.id)}>
                    I&apos;ve switched, try again
                  </a>
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

function RowEnd(props: { p: ConnectionView; href: string; waiting: boolean; needsPro: boolean; helpOpen: boolean; onWait: () => void; onHelp: () => void }) {
  const { p, href, waiting, needsPro } = props;
  if (p.mode === "unavailable") return <span className={s.waiting}>Coming later</span>;
  if (waiting)
    return (
      <span className={s.waiting} role="status">
        <span className={s.spinner} aria-hidden="true" />
        Waiting for {p.name}…
      </span>
    );
  if (p.status === "connected")
    return (
      <span className={s.done} role="status">
        <span className={s.check} aria-hidden="true">
          <Icon name="check" size={13} strokeWidth={2.2} />
        </span>
        Connected
      </span>
    );
  if (needsPro)
    return (
      <button type="button" className={s.helpBtn} aria-expanded={props.helpOpen} onClick={props.onHelp}>
        How to switch
      </button>
    );
  const verb = p.status === "expired" ? "Reconnect" : "Connect";
  return (
    <a href={href} className={s.connectBtn} aria-label={`${verb} ${p.name}`} onClick={props.onWait}>
      {verb}
    </a>
  );
}
