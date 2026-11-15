"use client";

import { useLayoutEffect, useRef } from "react";
import { frameText, parseCountable } from "@/lib/motion/countUp";

interface Props {
  value: string;
  /** Milliseconds before counting starts. */
  delay?: number;
  duration?: number;
  className?: string;
}

/**
 * Renders `value` and, after mount or when it changes, counts up to it.
 * The server-rendered text is always the final value, and a timer guarantees it
 * lands there even if animation frames are throttled.
 */
export function CountUp({ value, delay = 0, duration = 900, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const node = ref.current?.firstChild;
    const c = parseCountable(value);
    if (!node || !c || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const start = performance.now() + delay;
    node.nodeValue = frameText(c, 0);
    const tick = () => {
      const t = (performance.now() - start) / duration;
      node.nodeValue = frameText(c, t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const safety = window.setTimeout(() => {
      cancelAnimationFrame(raf);
      node.nodeValue = value;
    }, delay + duration + 250);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(safety);
      node.nodeValue = value;
    };
  }, [value, delay, duration]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
