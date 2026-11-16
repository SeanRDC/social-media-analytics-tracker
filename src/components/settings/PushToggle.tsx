"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/Switch";
import type { BrowserSubscription } from "@/lib/push";
import s from "./Settings.module.css";

type State = "checking" | "unsupported" | "off" | "on" | "blocked";

/** VAPID public keys are base64url; the browser wants raw bytes. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** What this device can do, registering the service worker when push is possible. */
async function detect(): Promise<State> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
    return (await reg.pushManager.getSubscription()) ? "on" : "off";
  } catch {
    return "unsupported";
  }
}

interface Props {
  vapidPublicKey: string;
  onSubscribe: (sub: BrowserSubscription) => Promise<void>;
  onUnsubscribe: (endpoint: string) => Promise<void>;
}

/** Push notifications on this device. iPhone and iPad need the app added to the Home Screen first. */
export function PushToggle({ vapidPublicKey, onSubscribe, onUnsubscribe }: Props) {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    detect().then((st) => !cancelled && setState(st));
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async (on: boolean) => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (on) {
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidPublicKey) });
        const json = sub.toJSON();
        await onSubscribe({ endpoint: sub.endpoint, keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" } });
        setState("on");
      } else {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await onUnsubscribe(sub.endpoint);
          await sub.unsubscribe();
        }
        setState("off");
      }
    } catch {
      setState(Notification.permission === "denied" ? "blocked" : on ? "off" : "on");
    } finally {
      setBusy(false);
    }
  };

  const note: Record<State, string> = {
    checking: "Checking this device…",
    unsupported: "This browser doesn't support push. On iPhone and iPad, add the app to your Home Screen first.",
    blocked: "Notifications are blocked for this site. Allow them in your browser settings to turn this on.",
    off: "Alerts also arrive as notifications on this device.",
    on: "Alerts arrive as notifications on this device.",
  };

  return (
    <div className={s.row}>
      <span className={s.pfText}>
        <b>Push notifications on this device</b>
        <small role="status">{note[state]}</small>
      </span>
      {(state === "on" || state === "off") && <Switch label="Push notifications on this device" hideLabel checked={state === "on"} disabled={busy} onChange={toggle} />}
    </div>
  );
}
