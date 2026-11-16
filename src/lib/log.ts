/**
 * Structured logs: one JSON object per line, which Vercel's log search and any
 * log drain can filter by `event`. Pass ids and counts only, never tokens,
 * emails or other personal data.
 */
type Level = "info" | "warn" | "error";
type Field = string | number | boolean | null | undefined;

export function logEvent(level: Level, event: string, fields: Record<string, Field> = {}): void {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}
