"use client";

import { useState, type CSSProperties } from "react";
import { Icon } from "@/components/icons/Icon";
import { Switch } from "@/components/ui/Switch";
import s from "./Reports.module.css";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function ScheduleCard({ email }: { email: string }) {
  const [on, setOn] = useState(true);
  const [day, setDay] = useState("Monday");

  return (
    <section className={`${s.card} ${s.schedule} glass rim reveal`} style={{ "--i": 5 } as CSSProperties} aria-labelledby="sched-h">
      <div className={s.schedTop}>
        <div>
          <h2 id="sched-h" className={s.h2}>
            Weekly email report
          </h2>
          <p className={s.desc}>A one-page snapshot of every platform, sent before your week starts.</p>
        </div>
        <Switch label="Send weekly email report" hideLabel checked={on} onChange={setOn} />
      </div>
      <div className={`${s.schedBody} ${on ? "" : s.off}`} aria-hidden={!on}>
        <label className={s.field}>
          <span>Send on</span>
          <span className={s.selectWrap}>
            <select value={day} onChange={(e) => setDay(e.target.value)} disabled={!on}>
              {DAYS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <Icon name="down" size={13} />
          </span>
        </label>
        <div className={s.field}>
          <span>At</span>
          <b>9:00 a.m.</b>
        </div>
        <div className={s.field}>
          <span>To</span>
          <b>{email}</b>
        </div>
      </div>
      <p className={s.status} role="status">
        <Icon name={on ? "check" : "clock"} size={14} />
        {on ? `Next report: ${day} at 9:00 a.m.` : "Weekly email is off"}
      </p>
    </section>
  );
}
