"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/Switch";
import s from "./Settings.module.css";

const ALERTS = [
  { id: "spike", title: "A post takes off", desc: "When a post gets twice your usual views in its first day.", on: true },
  { id: "milestone", title: "Follower milestones", desc: "Every 10K followers on any platform.", on: true },
  { id: "drop", title: "Engagement drops", desc: "When engagement falls more than 20% week over week.", on: false },
  { id: "reconnect", title: "Account needs reconnecting", desc: "When a platform stops sharing data with us.", on: true },
];

export function AlertSettings() {
  const [state, setState] = useState<Record<string, boolean>>(Object.fromEntries(ALERTS.map((a) => [a.id, a.on])));
  return (
    <ul className={s.list}>
      {ALERTS.map((a) => (
        <li key={a.id} className={s.row}>
          <span className={s.pfText}>
            <b id={`alert-${a.id}`}>{a.title}</b>
            <small>{a.desc}</small>
          </span>
          <Switch label={a.title} hideLabel checked={state[a.id]} onChange={(v) => setState((st) => ({ ...st, [a.id]: v }))} />
        </li>
      ))}
    </ul>
  );
}
