"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { Icon } from "@/components/icons/Icon";
import { Switch } from "@/components/ui/Switch";
import type { ScheduleView } from "@/lib/reports/schedule";
import s from "./Reports.module.css";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const hourLabel = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? "a.m." : "p.m."}`;

const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

interface Props {
  email: string;
  initial: ScheduleView;
  /** Server Action that stores the schedule. */
  onSave: (v: ScheduleView) => Promise<void>;
}

export function ScheduleCard({ email, initial, onSave }: Props) {
  const [v, setV] = useState(initial);
  const [error, setError] = useState(false);
  const [saving, startSaving] = useTransition();

  const save = (next: ScheduleView) => {
    const previous = v;
    // the time is in the zone of the device the person is using now
    const withZone = { ...next, timezone: browserZone() };
    setV(withZone);
    setError(false);
    startSaving(async () => {
      try {
        await onSave(withZone);
      } catch {
        setV(previous);
        setError(true);
      }
    });
  };

  const day = DAYS[v.dayOfWeek - 1] ?? DAYS[0];
  return (
    <section className={`${s.card} ${s.schedule} glass rim reveal`} style={{ "--i": 5 } as CSSProperties} aria-labelledby="sched-h">
      <div className={s.schedTop}>
        <div>
          <h2 id="sched-h" className={s.h2}>
            Weekly email report
          </h2>
          <p className={s.desc}>A one-page snapshot of every platform, sent before your week starts.</p>
        </div>
        <Switch label="Send weekly email report" hideLabel checked={v.enabled} onChange={(on) => save({ ...v, enabled: on })} />
      </div>
      <div className={`${s.schedBody} ${v.enabled ? "" : s.off}`} aria-hidden={!v.enabled}>
        <label className={s.field}>
          <span>Send on</span>
          <span className={s.selectWrap}>
            <select value={day} onChange={(e) => save({ ...v, dayOfWeek: DAYS.indexOf(e.target.value) + 1 })} disabled={!v.enabled}>
              {DAYS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <Icon name="down" size={13} />
          </span>
        </label>
        <div className={s.field}>
          <span>At</span>
          <b>{hourLabel(v.hour)}</b>
        </div>
        <div className={s.field}>
          <span>To</span>
          <b>{email}</b>
        </div>
      </div>
      <p className={s.status} role="status">
        <Icon name={error ? "close" : v.enabled ? "check" : "clock"} size={14} />
        {error ? "Couldn't save. Please try again." : saving ? "Saving…" : v.enabled ? `Next report: ${day} at ${hourLabel(v.hour)} (${v.timezone.replace(/_/g, " ")})` : "Weekly email is off"}
      </p>
    </section>
  );
}
