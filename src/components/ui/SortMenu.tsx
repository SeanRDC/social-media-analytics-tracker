"use client";

import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons/Icon";
import { useAnchoredMenu } from "@/hooks/useAnchoredMenu";
import { useDismiss } from "@/hooks/useDismiss";
import s from "./SortMenu.module.css";

interface Props<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}

/** Pill button that drops a menu. Closes on choice, outside click, Escape or when the page hides. */
export function SortMenu<T extends string>({
  value,
  options,
  onChange,
  label,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  useAnchoredMenu(button, menu, open, "end");
  const current = options.find((o) => o.value === value)?.label ?? "";

  useDismiss(open, [wrap, menu], (reason) => {
    setOpen(false);
    if (reason === "escape") button.current?.focus();
  });

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
      {open &&
        createPortal(
          <div
            ref={menu}
            id={id}
            role="menu"
            aria-label={label}
            className={s.menu}
          >
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
          </div>,
          document.body,
        )}
    </div>
  );
}
