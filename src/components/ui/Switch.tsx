"use client";

import s from "./Switch.module.css";

interface Props {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Hide the visible label when a row already shows it. */
  hideLabel?: boolean;
  id?: string;
  disabled?: boolean;
}

export function Switch({ label, checked, onChange, hideLabel = false, id, disabled = false }: Props) {
  return (
    <button id={id} type="button" role="switch" aria-checked={checked} aria-label={hideLabel ? label : undefined} className={s.sw} disabled={disabled} onClick={() => onChange(!checked)}>
      <span className={s.track} aria-hidden="true">
        <span className={s.knob} />
      </span>
      {!hideLabel && <span className={s.label}>{label}</span>}
    </button>
  );
}
