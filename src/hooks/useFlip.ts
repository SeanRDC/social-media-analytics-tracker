"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion/reducedMotion";

/**
 * FLIP reordering: call `capture()` right before the order changes; after the
 * re-render each registered element glides from its old position to its new one.
 */
export function useFlip<E extends HTMLElement>(orderKey: unknown) {
  const els = useRef(new Map<string, E>());
  const before = useRef(new Map<string, number>());

  const register = useCallback(
    (key: string) => (el: E | null) => {
      if (el) els.current.set(key, el);
      else els.current.delete(key);
    },
    [],
  );

  const capture = useCallback(() => {
    els.current.forEach((el, k) => before.current.set(k, el.getBoundingClientRect().top));
  }, []);

  useLayoutEffect(() => {
    if (before.current.size === 0) return;
    const reduce = prefersReducedMotion();
    els.current.forEach((el, k) => {
      const was = before.current.get(k);
      if (was == null || reduce || typeof el.animate !== "function") return;
      const dy = was - el.getBoundingClientRect().top;
      if (dy) el.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], { duration: 450, easing: "cubic-bezier(.16,1,.3,1)" });
    });
    before.current.clear();
  }, [orderKey]);

  return { register, capture };
}
