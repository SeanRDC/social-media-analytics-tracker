"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons/Icon";
import { useAnchoredMenu } from "@/hooks/useAnchoredMenu";
import s from "./Select.module.css";

interface Option<T> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  /** Accessible name; shown before the value for screen readers. */
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  /** "pill": grey filter pill. "field": white bordered form field. */
  variant?: "pill" | "field";
  disabled?: boolean;
  className?: string;
}

/**
 * A dropdown drawn in the site's style instead of the browser's native list.
 * Keyboard: ↑/↓/Enter/Space open; ↑/↓/Home/End move; Enter/Space choose;
 * Escape/Tab close; typing a letter jumps to the next option starting with it.
 */
export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  variant = "pill",
  disabled,
  className,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  useAnchoredMenu(button, list, open);
  const selected = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const current = options[selected]?.label ?? "";

  const show = (index = selected) => {
    if (disabled) return;
    setActive(index);
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  const choose = (index: number) => {
    const o = options[index];
    if (o && o.value !== value) onChange(o.value);
    close();
  };

  // focus the list when it opens, so the keys below reach it
  useEffect(() => {
    if (open) list.current?.focus();
  }, [open]);

  // keep the active option visible while moving through a long list
  useEffect(() => {
    if (open)
      list.current
        ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
        ?.scrollIntoView?.({ block: "nearest" });
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!wrap.current?.contains(t) && !list.current?.contains(t))
        setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      // a hidden page keeps its components mounted; never leave the list open behind it
      setOpen(false);
    };
  }, [open]);

  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      show();
    }
  };

  const onListKey = (e: KeyboardEvent) => {
    const last = options.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(last, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        // the list lives at the end of <body>; hand focus back so Tab continues from the button
        close();
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const k = e.key.toLowerCase();
          const order = [...options.keys()].map(
            (n) => (active + 1 + n) % options.length,
          );
          const hit = order.find((n) =>
            options[n].label.toLowerCase().startsWith(k),
          );
          if (hit !== undefined) setActive(hit);
        }
    }
  };

  return (
    <div ref={wrap} className={`${s.wrap} ${className ?? ""}`}>
      <button
        ref={button}
        type="button"
        className={`${s.btn} ${s[variant]}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={`${label}: ${current}`}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        onKeyDown={onButtonKey}
      >
        <span className={s.value}>{current}</span>
        <Icon name="down" size={13} className={s.chev} />
      </button>
      {open &&
        createPortal(
          <ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            aria-label={label}
            aria-activedescendant={`${id}-${active}`}
            tabIndex={-1}
            className={s.menu}
            onKeyDown={onListKey}
          >
            {options.map((o, i) => (
              <li
                key={String(o.value)}
                id={`${id}-${i}`}
                data-index={i}
                role="option"
                aria-selected={i === selected}
                data-active={i === active}
                className={s.item}
                onPointerMove={() => setActive(i)}
                onClick={() => choose(i)}
              >
                {o.label}
                {i === selected && <Icon name="check" size={14} />}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}
