const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}

/** 248600 → "248.6K", 4900000 → "4.9M", 42 → "42". */
export function formatCompact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (a >= 1_000) return `${trim(n / 1_000)}K`;
  return String(Math.round(n));
}

/** Growth with an explicit sign; uses a true minus for declines. */
export function formatSigned(n: number): string {
  if (n === 0) return "0";
  return n > 0 ? `+${formatCompact(n)}` : `−${formatCompact(-n)}`;
}

export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "2026-11-11" → "Nov 11" (parsed as a calendar date, no time zone shift). */
export function formatDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/** Shown wherever a platform did not report a number: never "0". */
export const NO_DATA = "—";

/** Formats a reported number, or the no-data mark when nothing was reported. */
export function orNoData(n: number | null | undefined, format: (n: number) => string = formatCompact): string {
  return n == null ? NO_DATA : format(n);
}

/** "since Nov 19" when a period is only partly reported, else "". */
export function sinceNote(dataSince: string | null | undefined): string {
  return dataSince ? `since ${formatDate(dataSince)}` : "";
}
