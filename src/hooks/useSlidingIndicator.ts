"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Positions an indicator element over whichever child of the container has
 * `data-active="true"`. Writes styles directly so moving it never re-renders.
 * The container must be `position: relative`.
 */
export function useSlidingIndicator<C extends HTMLElement = HTMLDivElement>(activeKey: string | number | null) {
  const container = useRef<C>(null);
  const indicator = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const c = container.current;
    const ind = indicator.current;
    if (!c || !ind) return;
    const place = () => {
      const active = c.querySelector<HTMLElement>('[data-active="true"]');
      if (!active) {
        ind.style.opacity = "0";
        return;
      }
      ind.style.opacity = "1";
      ind.style.width = `${active.offsetWidth}px`;
      ind.style.height = `${active.offsetHeight}px`;
      ind.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(c);
    // enable the spring only after the first placement, so it doesn't slide in from a corner
    const raf = requestAnimationFrame(() => {
      ind.dataset.ready = "true";
    });
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [activeKey]);

  return { container, indicator };
}
