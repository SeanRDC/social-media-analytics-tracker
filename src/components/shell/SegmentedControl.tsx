"use client";

import { useSlidingIndicator } from "@/hooks/useSlidingIndicator";
import s from "./SegmentedControl.module.css";

interface Option<T> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "md" | "sm";
  className?: string;
}

export function SegmentedControl<T extends string | number>({ label, options, value, onChange, size = "md", className }: Props<T>) {
  const { container, indicator } = useSlidingIndicator(value);
  return (
    <div ref={container} role="group" aria-label={label} className={`${s.seg} ${size === "sm" ? s.sm : ""} ${className ?? ""}`}>
      <span ref={indicator} className={s.ind} aria-hidden="true" />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={on}
            data-active={on}
            className={s.opt}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
