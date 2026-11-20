"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Why a popup closed: a press outside it, Escape, or its page being hidden or left. */
export type DismissReason = "outside" | "escape" | "hidden";

/**
 * Closes an open popup (menu, list, panel) the way people expect: a press
 * anywhere outside the given elements, or Escape. Navigating away keeps the
 * page mounted but hidden, so the popup also closes when this stops watching.
 * Pass `escape: false` when the popup handles Escape with its own keys.
 */
export function useDismiss(open: boolean, inside: RefObject<HTMLElement | null>[], onDismiss: (reason: DismissReason) => void, { escape = true } = {}) {
  // the latest callback, so callers can pass an inline function without re-subscribing
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  });
  const refs = useRef(inside);
  useEffect(() => {
    refs.current = inside;
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!refs.current.some((r) => r.current?.contains(t))) dismiss.current("outside");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss.current("escape");
    };
    document.addEventListener("pointerdown", onDown);
    if (escape) document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      dismiss.current("hidden");
    };
  }, [open, escape]);
}
