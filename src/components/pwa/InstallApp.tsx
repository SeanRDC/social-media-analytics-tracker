"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { useDismiss } from "@/hooks/useDismiss";
import { isIos } from "@/lib/platform";
import s from "./InstallApp.module.css";

/** Chrome and Edge's install offer; not in the standard DOM types yet. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Mode = "hidden" | "prompt" | "ios";

const installed = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/**
 * "Install app": Chrome and Edge get their own install dialog; iPhone and iPad
 * (where Safari has none) get the two steps to add it to the Home Screen.
 * Hidden when the app is already installed or the browser can't install it.
 */
export function InstallApp({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [mode, setMode] = useState<Mode>("hidden");
  const [help, setHelp] = useState(false);
  const offer = useRef<InstallPromptEvent | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  useDismiss(help, [button, tip], () => setHelp(false));

  useEffect(() => {
    if (installed()) return;
    const onOffer = (e: Event) => {
      e.preventDefault();
      offer.current = e as InstallPromptEvent;
      setMode("prompt");
    };
    const onInstalled = () => setMode("hidden");
    window.addEventListener("beforeinstallprompt", onOffer);
    window.addEventListener("appinstalled", onInstalled);
    // Safari on iOS never offers; show the manual steps instead
    if (isIos()) queueMicrotask(() => setMode("ios"));
    return () => {
      window.removeEventListener("beforeinstallprompt", onOffer);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (mode === "hidden") return null;

  const install = async () => {
    if (mode === "ios") return setHelp((h) => !h);
    const e = offer.current;
    if (!e) return;
    await e.prompt();
    const { outcome } = await e.userChoice;
    offer.current = null;
    if (outcome === "accepted") setMode("hidden");
  };

  return (
    <span className={s.wrap}>
      <button ref={button} type="button" className={s.button} data-tone={tone} aria-label="Install app" onClick={() => void install()} aria-expanded={mode === "ios" ? help : undefined}>
        <Icon name="download" size={15} strokeWidth={2} />
        <span className={s.label}>Install app</span>
      </button>
      {help && (
        <div ref={tip} className={s.tip} role="dialog" aria-label="Add Ispector to your Home Screen">
          <b>Add Ispector to your Home Screen</b>
          <ol>
            <li>
              Tap <Icon name="share" size={14} /> <b>Share</b> in Safari&apos;s toolbar.
            </li>
            <li>
              Choose <b>Add to Home Screen</b>, then <b>Add</b>.
            </li>
          </ol>
        </div>
      )}
    </span>
  );
}
