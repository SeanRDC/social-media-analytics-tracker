"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import s from "./SortMenu.module.css";

interface Props<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}

/** Pill button that drops a menu. Closes on choice, outside click, Escape or when the page hides. */
export function SortMenu<T extends string>({ value, options, onChange, label }: Props<T>) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value)?.label ?? "";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      // navigating away keeps this page mounted but hidden; never leave the menu open behind it
      setOpen(false);
    };
  }, [open]);

  return (
    <div ref={wrap} className={s.wrap}>
      <button
        ref={button}
        type="button"
        className={s.btn}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`${label}: ${current}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{current}</span>
        <Icon name="down" size={12} className={s.chev} />
      </button>
      {open && (
        <div id={id} role="menu" aria-label={label} className={s.menu}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="menuitemradio"
              aria-checked={o.value === value}
              className={s.item}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
                button.current?.focus();
              }}
            >
              {o.label}
              {o.value === value && <Icon name="check" size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
