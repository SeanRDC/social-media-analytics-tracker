"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import s from "./Checkbox.module.css";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  name?: string;
  disabled?: boolean;
}

/**
 * A real checkbox (keyboard, screen readers and forms all work) drawn in the
 * site's style: the native box is visually hidden behind the custom one.
 */
export function Checkbox({ checked, onChange, children, name, disabled }: Props) {
  return (
    <label className={s.row} data-checked={checked} data-disabled={disabled || undefined}>
      <input type="checkbox" className={s.input} name={name} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className={s.box} aria-hidden="true">
        <Icon name="check" size={14} strokeWidth={2.6} />
      </span>
      <span className={s.text}>{children}</span>
    </label>
  );
}
