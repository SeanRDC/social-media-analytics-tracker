/** ISO calendar dates (YYYY-MM-DD) in UTC. Stats are stored per day, so these avoid local-time drift. */

const DAY = 86_400_000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

export const parseIso = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

export const addDays = (iso: string, n: number): string => isoDate(new Date(parseIso(iso).getTime() + n * DAY));

/** Whole days from `a` to `b` (positive when b is later). */
export const daysBetween = (a: string, b: string): number => Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / DAY);

/** "Mon" … "Sun". */
export const weekdayShort = (iso: string): string => WEEKDAYS[parseIso(iso).getUTCDay()];

/** Every date from `start` to `end`, inclusive. */
export function dateRange(start: string, end: string): string[] {
  const n = daysBetween(start, end);
  return n < 0 ? [] : Array.from({ length: n + 1 }, (_, i) => addDays(start, i));
}
