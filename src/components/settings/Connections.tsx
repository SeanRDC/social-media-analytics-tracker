"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { ImportOutcome } from "@/app/actions/sync";
import { Icon } from "@/components/icons/Icon";
import { connectHref, connectMessage, type ConnectResult } from "@/lib/connect/result";
import type { ConnectionStatus, ConnectionView, PlatformId } from "@/lib/data/types";
import s from "./Settings.module.css";

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected: "Connected",
  "not-connected": "Not connected",
  "needs-professional": "Needs a Professional account",
  expired: "Access expired",
};

interface Props {
  initial: ConnectionView[];
  result: ConnectResult | null;
  /** Server Action: revokes access and deletes the platform's stored stats. */
  onDisconnect: (platform: PlatformId) => Promise<void>;
  /** Server Action: the first import, run right after a platform connects. */
  onImport?: (platform: PlatformId) => Promise<ImportOutcome>;
}

const IMPORT_NOTE: Record<ImportOutcome | "running", string> = {
  running: "Importing its history…",
  imported: "Its history is imported.",
  "not-yet": "Its numbers arrive in a coming update.",
  reconnect: "Access expired straight away. Please reconnect.",
  busy: "The platform is busy right now; tonight's sync will import it.",
  failed: "The import didn't finish; tonight's sync will try again.",
};

export function Connections({ initial, result, onDisconnect, onImport }: Props) {
  const router = useRouter();
  const [removed, setRemoved] = useState<ReadonlySet<PlatformId>>(new Set());
  const [imported, setImported] = useState<ImportOutcome | "running" | null>(null);
  const started = useRef(false);

  // first import right after coming back from a successful connection
  useEffect(() => {
    if (!result?.ok || !onImport || started.current) return;
    started.current = true;
    setImported("running");
    onImport(result.platform)
      .catch((): ImportOutcome => "failed")
      .then((o) => {
        setImported(o);
        if (o === "imported" || o === "reconnect") router.refresh();
      });
  }, [result, onImport, router]);
  const [confirming, setConfirming] = useState<PlatformId | null>(null);
  const [failed, setFailed] = useState<PlatformId | null>(null);
  const [, startTransition] = useTransition();

  const disconnect = (id: PlatformId) => {
    setConfirming(null);
    setFailed(null);
    setRemoved((r) => new Set(r).add(id));
    startTransition(async () => {
      try {
        await onDisconnect(id);
      } catch {
        setRemoved((r) => {
          const next = new Set(r);
          next.delete(id);
          return next;
        });
        setFailed(id);
      }
    });
  };

  return (
    <>
      {result && (
        <p className={`${s.info} ${result.ok ? "" : s.notice}`} role={result.ok ? "status" : "alert"}>
          <Icon name={result.ok ? "check" : "sparkle"} size={15} />
          <span>
            {connectMessage(result)}
            {imported && ` ${IMPORT_NOTE[imported]}`}
          </span>
        </p>
      )}
      <ul className={s.list}>
        {initial.map((c) => {
          const status: ConnectionStatus = removed.has(c.id) ? "not-connected" : c.status;
          const on = status === "connected";
          const sub = on || status === "expired" ? c.account : c.mode === "unavailable" ? "Not available yet" : "Connect to include it in your dashboard";
          const updated = on && c.updatedAt ? ` · Updated ${new Date(c.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "";
          return (
            <li key={c.id} className={s.row} aria-label={c.name}>
              <span className={s.pf}>
                <span className="dot" style={{ background: `var(--p-${c.id})` }} />
                <span className={s.pfText}>
                  <b>{c.name}</b>
                  <small>
                    {sub}
                    {updated}
                    {c.mode === "simulated" && " · Simulated locally"}
                  </small>
                  {on && c.syncError && <small className={s.warnText}>Last update didn&apos;t finish: {c.syncError} We&apos;ll keep trying.</small>}
                  {status === "expired" && c.deleteOn && (
                    <small className={s.warnText}>
                      Reconnect by {new Date(c.deleteOn).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} to keep its numbers. After that we delete the data we stored from it.
                    </small>
                  )}
                  {failed === c.id && (
                    <small className={s.err} role="alert">
                      Couldn&apos;t disconnect {c.name}. Please try again.
                    </small>
                  )}
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
                  {c.mode === "unavailable" ? (
                    <span className={s.state}>Coming later</span>
                  ) : (
                    <>
                      <span className={`${s.state} ${on ? s.stateOn : ""}`}>
                        {on && <Icon name="check" size={13} strokeWidth={2} />}
                        {STATUS_LABEL[status]}
                      </span>
                      {on ? (
                        <button type="button" className={s.ghost} onClick={() => setConfirming(c.id)}>
                          Disconnect
                        </button>
                      ) : (
                        <a href={connectHref(c.id, "/settings")} className={s.solid}>
                          {status === "expired" ? "Reconnect" : "Connect"}
                        </a>
                      )}
                    </>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
