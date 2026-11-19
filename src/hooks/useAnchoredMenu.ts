"use client";

import { useLayoutEffect, type RefObject } from "react";

const GAP = 6;
const MAX_HEIGHT = 280;
const EDGE = 12;

/**
 * Places a menu that is portalled to <body> right under (or, near the bottom of
 * the screen, above) its button. Rendering the menu outside the page keeps it in
 * front of cards: their entrance animations create stacking contexts that a
 * z-index inside the page cannot escape. Follows the button on scroll and resize.
 */
export function useAnchoredMenu(anchor: RefObject<HTMLElement | null>, menu: RefObject<HTMLElement | null>, open: boolean, align: "start" | "end" = "start") {
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchor.current;
      const m = menu.current;
      if (!a || !m) return;
      const r = a.getBoundingClientRect();
      const below = window.innerHeight - r.bottom - GAP - EDGE;
      const above = r.top - GAP - EDGE;
      const up = below < Math.min(MAX_HEIGHT, m.scrollHeight) && above > below;
      Object.assign(m.style, {
        position: "fixed",
        minWidth: `${r.width}px`,
        maxHeight: `${Math.max(120, Math.min(MAX_HEIGHT, up ? above : below))}px`,
        top: up ? "" : `${r.bottom + GAP}px`,
        bottom: up ? `${window.innerHeight - r.top + GAP}px` : "",
        left: align === "start" ? `${Math.max(EDGE, r.left)}px` : "",
        right: align === "end" ? `${Math.max(EDGE, window.innerWidth - r.right)}px` : "",
        transformOrigin: `${up ? "bottom" : "top"} ${align === "start" ? "left" : "right"}`,
      });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchor, menu, open, align]);
}
