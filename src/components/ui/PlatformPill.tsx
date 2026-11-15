import type { PlatformId } from "@/lib/data/types";
import { PLATFORM_NAMES } from "@/lib/platforms";
import s from "./PlatformPill.module.css";

/** Platform colour is always paired with its name, never colour alone. */
export function PlatformPill({ id, plain = false }: { id: PlatformId; plain?: boolean }) {
  return (
    <span className={plain ? s.plain : s.pill}>
      <span className="dot" style={{ background: `var(--p-${id})` }} />
      {PLATFORM_NAMES[id]}
    </span>
  );
}
