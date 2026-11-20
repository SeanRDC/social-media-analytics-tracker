"use client";

import { useSyncExternalStore } from "react";
import { readThemeChoice, setThemeChoice, THEME_KEY, type ThemeChoice } from "@/lib/theme";
import s from "./Settings.module.css";

const OPTIONS: { id: ThemeChoice; label: string; swatch: string }[] = [
  { id: "light", label: "Light", swatch: s.swatchLight },
  { id: "dark", label: "Dark", swatch: s.swatchDark },
  { id: "system", label: "Match device", swatch: s.swatchSystem },
];

// the stored choice is an external store: localStorage, changed here or in another tab
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
};

/** Light, dark or follow the device. Saved on this device and applied at once. */
export function ThemePicker() {
  // the server can't know the stored choice; it renders "light" and the client corrects it after hydration
  const choice = useSyncExternalStore(subscribe, readThemeChoice, () => "light" as ThemeChoice);
  const pick = (c: ThemeChoice) => {
    setThemeChoice(c);
    listeners.forEach((l) => l());
  };

  return (
    <div className={s.themes} role="radiogroup" aria-label="Theme">
      {OPTIONS.map((o) => (
        <label key={o.id} className={s.theme} data-on={choice === o.id}>
          <input type="radio" name="theme" value={o.id} checked={choice === o.id} onChange={() => pick(o.id)} className="sr-only" />
          <span className={`${s.swatch} ${o.swatch}`} aria-hidden="true" />
          {o.label}
        </label>
      ))}
    </div>
  );
}
