"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import type { ConnectionStatus, PlatformId } from "@/lib/data/types";
import s from "./Settings.module.css";

interface Connection {
  id: PlatformId;
  name: string;
  account: string;
  status: ConnectionStatus;
}

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected: "Connected",
  "not-connected": "Not connected",
  "needs-professional": "Needs a Professional account",
  expired: "Access expired",
};

export function Connections({ initial }: { initial: Connection[] }) {
  const [list, setList] = useState(initial);
  const [confirming, setConfirming] = useState<PlatformId | null>(null);

  const disconnect = (id: PlatformId) => {
    setList((l) => l.map((c) => (c.id === id ? { ...c, status: "not-connected" } : c)));
    setConfirming(null);
  };

  return (
    <ul className={s.list}>
      {list.map((c) => {
        const on = c.status === "connected";
        return (
          <li key={c.id} className={s.row} aria-label={c.name}>
            <span className={s.pf}>
              <span className="dot" style={{ background: `var(--p-${c.id})` }} />
              <span className={s.pfText}>
                <b>{c.name}</b>
                <small>{on ? c.account : "Connect to include it in your dashboard"}</small>
              </span>
            </span>
            {confirming === c.id ? (
              <span className={s.confirm} role="group" aria-label={`Confirm disconnecting ${c.name}`}>
                <span>Disconnect {c.name}?</span>
                <button type="button" className={s.danger} onClick={() => disconnect(c.id)}>
                  Yes, disconnect
                </button>
                <button type="button" className={s.ghost} onClick={() => setConfirming(null)}>
                  Keep
                </button>
              </span>
            ) : (
              <span className={s.rowEnd}>
                <span className={`${s.state} ${on ? s.stateOn : ""}`}>
                  {on && <Icon name="check" size={13} strokeWidth={2} />}
                  {STATUS_LABEL[c.status]}
                </span>
                {on ? (
                  <button type="button" className={s.ghost} onClick={() => setConfirming(c.id)}>
                    Disconnect
                  </button>
                ) : (
                  <Link href="/onboarding/connect" className={s.solid}>
                    Connect
                  </Link>
                )}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
