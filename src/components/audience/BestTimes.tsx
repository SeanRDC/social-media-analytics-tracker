"use client";

import { useState, type CSSProperties } from "react";
import { Icon } from "@/components/icons/Icon";
import { SegmentedControl } from "@/components/shell/SegmentedControl";
import type { Audience, PlatformId, PostingCell, PostingTimes } from "@/lib/data/types";
import { PLATFORM_NAMES } from "@/lib/platforms";
import s from "./Audience.module.css";

const FULL_DAY: Record<string, string> = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };

type Props = Pick<Audience, "slots" | "posting" | "online" | "minPosts" | "firstWeekDays" | "timeZone">;
type Mode = "posts" | "online";

/** "Asia/Manila" → "Manila time (GMT+8)"; "UTC" stays "UTC". */
export function zoneLabel(timeZone: string, at = new Date()): string {
  if (timeZone === "UTC") return "UTC";
  const city = timeZone.slice(timeZone.lastIndexOf("/") + 1).replace(/_/g, " ");
  try {
    const offset = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value;
    return offset ? `${city} time (${offset})` : `${city} time`;
  } catch {
    return `${city} time`;
  }
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** 1.46 → "1.5×" */
const times = (score: number) => `${score.toFixed(1)}×`;

/** Index of the highest non-null value, or -1. */
function bestOf(values: (number | null)[]): number {
  let best = -1;
  values.forEach((v, i) => {
    if (v !== null && (best < 0 || v > values[best]!)) best = i;
  });
  return best;
}

/**
 * Best time to post, two ways: how your own posts did by when they went out
 * (each measured at one week old against its platform's usual post), and,
 * where Instagram reports it, when your followers are online.
 */
export function BestTimes({ slots, posting, online, minPosts, firstWeekDays, timeZone }: Props) {
  const [mode, setMode] = useState<Mode>("posts");
  const [platform, setPlatform] = useState<"all" | PlatformId>("all");
  const [focus, setFocus] = useState<{ d: number; t: number } | null>(null);
  const showOnline = mode === "online" && online !== null;

  const platforms = posting.platforms.filter((p) => p.times.used + p.times.waiting + p.times.untracked > 0);
  const data: PostingTimes = (platform !== "all" && platforms.find((p) => p.id === platform)?.times) || posting.all;

  const values: (number | null)[][] = showOnline ? online.days.map((r) => r.cells) : data.days.map((r) => r.cells.map((c) => c.score));
  const flat = values.flat();
  const max = Math.max(0, ...flat.filter((v): v is number => v !== null));
  const bestIndex = bestOf(flat);
  const best = bestIndex < 0 ? null : { d: Math.floor(bestIndex / slots.length), t: bestIndex % slots.length };
  const days = (showOnline ? online.days : data.days).map((r) => r.day);
  const when = (d: number, t: number) => `${FULL_DAY[days[d]]} ${slots[t].label.toLowerCase()}`;

  const describe = (d: number, t: number) => {
    const where = `${when(d, t)} (${slots[t].hours})`;
    if (showOnline) {
      const v = online.days[d].cells[t];
      return v === null ? `${where} · nothing reported` : `${where} · about ${v.toLocaleString("en-US")} followers online an hour`;
    }
    const c: PostingCell = data.days[d].cells[t];
    if (c.score !== null) return `${where} · ${times(c.score)} your usual first-week views · ${plural(c.posts, "post")}`;
    return c.posts ? `${where} · ${plural(c.posts, "post")} so far, needs ${minPosts}` : `${where} · no posts yet`;
  };

  // with no cell scored yet, the best day and best window on their own still say something
  const bestSlot = bestOf(data.bySlot.map((c) => c.score));
  const bestDay = bestOf(data.byDay.map((c) => c.score));
  const fallback = [bestSlot >= 0 ? `${slots[bestSlot].label.toLowerCase()}s (${slots[bestSlot].hours})` : null, bestDay >= 0 ? `${FULL_DAY[days[bestDay]]}s` : null].filter(Boolean);

  let badge: string;
  let summary: string;
  if (best) {
    badge = when(best.d, best.t);
    summary = describe(best.d, best.t);
  } else if (!showOnline && fallback.length) {
    badge = `Best so far: ${fallback.map((f) => f!.split(" (")[0]).join(", ")}`;
    summary = `No single day and time has ${minPosts} posts yet. So far ${fallback.join(" and ")} do best.`;
  } else {
    badge = "Not enough posts yet";
    summary = showOnline ? "Instagram hasn't reported followers online yet." : `Each time needs ${minPosts} posts with a full first week. They fill in as you post.`;
  }

  const left = [
    data.waiting ? `${plural(data.waiting, "newer post")} ${data.waiting === 1 ? "counts" : "count"} once a week old` : null,
    data.untracked ? `${plural(data.untracked, "older post")} ${data.untracked === 1 ? "is" : "are"} left out: imported after ${data.untracked === 1 ? "its" : "their"} first week, so ${data.untracked === 1 ? "its" : "their"} first-week views were never recorded` : null,
  ].filter(Boolean);
  const method = showOnline
    ? `From Instagram's own hourly count of followers online, over the last ${plural(online.daysCovered, "day")}.`
    : `Each post's views ${firstWeekDays} days after publishing, compared with its platform's usual post (the median). A time needs ${minPosts} posts. Based on ${plural(data.used, "post")}${left.length ? `; ${left.join("; ")}` : ""}.`;

  return (
    <section className={`${s.card} ${s.heatCard} card reveal`} style={{ "--i": 3 } as CSSProperties} aria-labelledby="best-h">
      <div className={s.head}>
        <h2 id="best-h" className={s.h2}>
          Best time to post
        </h2>
        <span className={s.best}>
          <Icon name="sparkle" size={14} />
          <b>{badge}</b>
        </span>
      </div>

      {(online || platforms.length > 1) && (
        <div className={s.heatControls}>
          {online && (
            <SegmentedControl
              label="Show"
              size="sm"
              value={mode}
              onChange={(m) => {
                setMode(m);
                setFocus(null);
              }}
              options={[
                { value: "posts", label: "Your posts" },
                { value: "online", label: "Followers online" },
              ]}
            />
          )}
          {!showOnline && platforms.length > 1 && (
            <div className={s.heatFilter}>
              <SegmentedControl
                label="Platform"
                size="sm"
                value={platform}
                onChange={(p) => {
                  setPlatform(p);
                  setFocus(null);
                }}
                options={[{ value: "all" as const, label: "All" }, ...platforms.map((p) => ({ value: p.id, label: PLATFORM_NAMES[p.id] }))]}
              />
            </div>
          )}
        </div>
      )}

      <div className={s.heat} style={{ gridTemplateColumns: `var(--heat-axis) repeat(${days.length}, minmax(0, 1fr))` }} onPointerLeave={() => setFocus(null)}>
        <span />
        {days.map((day) => (
          <span key={day} className={s.axis}>
            {day}
          </span>
        ))}
        {slots.map((slot, t) => (
          <div key={slot.label} className={s.heatRow}>
            <span className={s.axis}>
              {slot.label}
              <small className={s.axisHours}>{slot.hours}</small>
            </span>
            {days.map((day, d) => {
              const v = values[d][t];
              const isBest = best?.d === d && best.t === t;
              return (
                <button
                  key={day}
                  type="button"
                  className={`${s.cell} ${v === null ? s.cellEmpty : ""} ${isBest ? s.cellBest : ""}`}
                  style={{ "--v": v === null || !max ? 0 : v / max, "--i": d + t } as CSSProperties}
                  aria-label={`${describe(d, t)}${isBest ? ", best" : ""}`}
                  onPointerEnter={() => setFocus({ d, t })}
                  onFocus={() => setFocus({ d, t })}
                  onBlur={() => setFocus(null)}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className={s.readout} role="status">
        {focus ? describe(focus.d, focus.t) : summary}
      </p>
      <p className={s.zone}>
        {method} Times in {zoneLabel(timeZone)}.
      </p>
    </section>
  );
}
