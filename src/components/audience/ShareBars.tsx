import type { CSSProperties } from "react";
import s from "./Audience.module.css";

interface Props {
  title: string;
  caption: string;
  rows: { label: string; share: number }[];
  index: number;
}

/** Horizontal share bars, every bar labelled with its value. */
export function ShareBars({ title, caption, rows, index }: Props) {
  const max = Math.max(...rows.map((r) => r.share));
  const id = `bars-${index}`;
  return (
    <section className={`${s.card} glass rim sweep lift reveal`} style={{ "--i": index } as CSSProperties} aria-labelledby={id}>
      <div className={s.head}>
        <h2 id={id} className={s.h2}>
          {title}
        </h2>
        <span className={s.caption}>{caption}</span>
      </div>
      <ul className={s.bars}>
        {rows.map((r, i) => (
          <li key={r.label} className={s.barRow}>
            <span className={s.barLabel}>{r.label}</span>
            <span className={s.track} aria-hidden="true">
              <i style={{ transform: `scaleX(${r.share / max})`, opacity: r.share === max ? 1 : 0.55, "--i": i } as CSSProperties} />
            </span>
            <b className={s.barVal}>{r.share}%</b>
          </li>
        ))}
      </ul>
    </section>
  );
}
