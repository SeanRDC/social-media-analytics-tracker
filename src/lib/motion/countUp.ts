export interface Countable {
  prefix: string;
  value: number;
  decimals: number;
  suffix: string;
  grouped: boolean;
}

const RE = /^([+\-−]?)(\d[\d,]*(?:\.\d+)?)(.*)$/;

/** "+9.8K" → { prefix "+", value 9.8, decimals 1, suffix "K" }. Null when the text is not a number. */
export function parseCountable(text: string): Countable | null {
  const m = RE.exec(text);
  if (!m) return null;
  const digits = m[2];
  const grouped = digits.includes(",");
  const plain = digits.replace(/,/g, "");
  return {
    prefix: m[1],
    value: Number(plain),
    decimals: (plain.split(".")[1] ?? "").length,
    suffix: m[3],
    grouped,
  };
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Text for progress `t` (0..1). At t = 1 this reproduces the original string exactly. */
export function frameText(c: Countable, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const v = c.value * easeOutCubic(k);
  const num = c.grouped
    ? v.toLocaleString("en-US", { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals })
    : v.toFixed(c.decimals);
  const prefix = k === 0 && c.grouped ? "" : c.prefix;
  return `${prefix}${num}${c.suffix}`;
}
