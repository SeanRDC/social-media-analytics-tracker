"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/Switch";
import type { AlertKind } from "@/lib/alerts/evaluate";
import s from "./Settings.module.css";

const ALERTS: { id: AlertKind; title: string; desc: string }[] = [
  { id: "spike", title: "A post takes off", desc: "When a new post gets twice your usual views." },
  { id: "milestone", title: "Follower milestones", desc: "Every 10K followers on any platform." },
  { id: "drop", title: "Engagement drops", desc: "When engagement falls more than 20% week over week." },
  { id: "reconnect", title: "Account needs reconnecting", desc: "When a platform stops sharing data with us." },
];

interface Props {
  initial: Record<AlertKind, boolean>;
  /** Server Action that stores one alert's on/off state. */
  onChange: (kind: AlertKind, enabled: boolean) => Promise<void>;
}

export function AlertSettings({ initial, onChange }: Props) {
  const [state, setState] = useState(initial);
  const [failed, setFailed] = useState<AlertKind | null>(null);
  const [, start] = useTransition();

  const toggle = (id: AlertKind, on: boolean) => {
    setState((st) => ({ ...st, [id]: on }));
    setFailed(null);
    start(async () => {
      try {
        await onChange(id, on);
      } catch {
        setState((st) => ({ ...st, [id]: !on }));
        setFailed(id);
      }
    });
  };

  return (
    <ul className={s.list}>
      {ALERTS.map((a) => (
        <li key={a.id} className={s.row}>
          <span className={s.pfText}>
            <b id={`alert-${a.id}`}>{a.title}</b>
            <small>{a.desc}</small>
            {failed === a.id && (
              <small className={s.err} role="alert">
                Couldn&apos;t save. Please try again.
              </small>
            )}
          </span>
          <Switch label={a.title} hideLabel checked={state[a.id]} onChange={(v) => toggle(a.id, v)} />
        </li>
      ))}
    </ul>
  );
}
