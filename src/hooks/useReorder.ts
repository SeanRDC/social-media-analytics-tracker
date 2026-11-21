"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { prefersReducedMotion } from "@/lib/motion/reducedMotion";

/** A mouse drag starts after this much movement, so a plain click still opens the card. */
const MOUSE_SLOP = 6;
/** On touch, holding this long picks a card up; moving sooner is a scroll. */
const HOLD_MS = 350;
const TOUCH_SLOP = 8;
/** Near the top or bottom of the screen the page scrolls along with the drag. */
const EDGE = 72;
const EDGE_SPEED = 14;
const SETTLE = { duration: 380, easing: "cubic-bezier(.16,1,.3,1)" };

interface Drag<K> {
  key: K;
  pointerId: number;
  touch: boolean;
  phase: "pending" | "active";
  startX: number;
  startY: number;
  x: number;
  y: number;
  /** Where on the card it was grabbed. */
  grabX: number;
  grabY: number;
  from: K[];
  timer: number;
}

/**
 * Drag-to-reorder for a list of cards laid out in a grid of any number of
 * columns (`list` must be `position: relative`).
 * - Mouse: drag a card; a click without moving still works.
 * - Touch: press and hold to pick a card up, then drag; a quick swipe scrolls.
 * - Keyboard: Space or Enter on a card's handle picks it up, arrow keys move
 *   it, Space or Enter drops it, Escape puts it back; each step is announced.
 * Other cards glide to their new places (FLIP). `onCommit` gets the new order
 * once a move ends with the order changed.
 */
export function useReorder<K extends string>(initial: readonly K[], { onCommit, nameOf }: { onCommit: (order: K[]) => void; nameOf: (key: K) => string }) {
  const [order, setOrder] = useState<K[]>([...initial]);
  // a new order from the server (another device, a reset) replaces the local one
  const [given, setGiven] = useState(initial.join());
  if (initial.join() !== given) {
    setGiven(initial.join());
    setOrder([...initial]);
  }
  const orderRef = useRef(order);
  // the latest callbacks, so the pointer listeners below never need re-subscribing
  const onCommitRef = useRef(onCommit);
  const nameOfRef = useRef(nameOf);
  useLayoutEffect(() => {
    orderRef.current = order;
    onCommitRef.current = onCommit;
    nameOfRef.current = nameOf;
  });

  const list = useRef<HTMLUListElement>(null);
  const items = useRef(new Map<K, HTMLElement>());
  const handles = useRef(new Map<K, HTMLElement>());
  const before = useRef<Map<K, { x: number; y: number }> | null>(null);
  const drag = useRef<Drag<K> | null>(null);
  const raf = useRef(0);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState<K | null>(null);
  const [held, setHeld] = useState<{ key: K; from: K[] } | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const registerItem = useCallback(
    (key: K) => (el: HTMLElement | null) => {
      if (el) items.current.set(key, el);
      else items.current.delete(key);
    },
    [],
  );
  const registerHandle = useCallback(
    (key: K) => (el: HTMLElement | null) => {
      if (el) handles.current.set(key, el);
      else handles.current.delete(key);
    },
    [],
  );

  /** Moves a card to a new index, remembering where everything was so it can glide. */
  const moveTo = useCallback((key: K, to: number) => {
    const o = orderRef.current;
    const from = o.indexOf(key);
    if (from < 0 || to < 0 || to >= o.length || from === to) return false;
    before.current = new Map([...items.current].map(([k, el]) => [k, { x: el.offsetLeft, y: el.offsetTop }]));
    const next = [...o];
    next.splice(from, 1);
    next.splice(to, 0, key);
    orderRef.current = next;
    setOrder(next);
    return true;
  }, []);

  // FLIP: every card except the one under the finger glides from its old slot to its new one
  useLayoutEffect(() => {
    const prev = before.current;
    before.current = null;
    if (!prev || prefersReducedMotion()) return;
    items.current.forEach((el, k) => {
      if (k === drag.current?.key && drag.current.phase === "active") return;
      const was = prev.get(k);
      if (!was || typeof el.animate !== "function") return;
      const dx = was.x - el.offsetLeft;
      const dy = was.y - el.offsetTop;
      if (dx || dy) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], SETTLE);
    });
    // a keyboard move re-inserts the card in the DOM, which can drop focus: keep it on the handle
    if (held) handles.current.get(held.key)?.focus();
  }, [order, held]);

  const finish = useCallback((from: K[]) => {
    const now = orderRef.current;
    if (now.join() !== from.join()) onCommitRef.current(now);
  }, []);

  /* ---------------------------------------------------------- pointer */

  /** Places the dragged card under the pointer and moves it to the nearest slot. */
  const follow = useCallback(() => {
    const d = drag.current;
    const ul = list.current;
    const el = d && items.current.get(d.key);
    if (!d || d.phase !== "active" || !ul || !el) return;
    const box = ul.getBoundingClientRect();
    const left = d.x - d.grabX - box.left;
    const top = d.y - d.grabY - box.top;
    el.style.transform = `translate(${left - el.offsetLeft}px, ${top - el.offsetTop}px) scale(1.03)`;

    // the slot whose centre is nearest the dragged card's centre
    const cx = left + el.offsetWidth / 2;
    const cy = top + el.offsetHeight / 2;
    let nearest = -1;
    let best = Infinity;
    orderRef.current.forEach((k, i) => {
      const it = items.current.get(k);
      if (!it) return;
      const dist = Math.hypot(it.offsetLeft + it.offsetWidth / 2 - cx, it.offsetTop + it.offsetHeight / 2 - cy);
      if (dist < best) [best, nearest] = [dist, i];
    });
    if (nearest >= 0 && moveTo(d.key, nearest)) {
      // its slot moved: re-place it so it stays under the pointer
      requestAnimationFrame(() => follow());
    }
  }, [moveTo]);

  const loop = useCallback(() => {
    const d = drag.current;
    if (!d || d.phase !== "active") return;
    // scroll along near the top or bottom edge
    const h = window.innerHeight;
    const dy = d.y < EDGE ? -EDGE_SPEED * (1 - d.y / EDGE) : d.y > h - EDGE ? EDGE_SPEED * (1 - (h - d.y) / EDGE) : 0;
    if (dy) window.scrollBy(0, dy);
    follow();
    raf.current = requestAnimationFrame(loop);
  }, [follow]);

  const activate = useCallback(() => {
    const d = drag.current;
    if (!d || d.phase === "active") return;
    d.phase = "active";
    // the card keeps the pointer: its release arrives even if it happens outside the window
    try {
      items.current.get(d.key)?.setPointerCapture(d.pointerId);
    } catch {
      // the pointer is already gone; pointerup / blur end the drag
    }
    setDragging(d.key);
    document.documentElement.style.setProperty("user-select", "none");
    document.documentElement.style.setProperty("-webkit-user-select", "none");
    if (d.touch) navigator.vibrate?.(10);
    setAnnouncement(`Picked up ${nameOfRef.current(d.key)}.`);
    raf.current = requestAnimationFrame(loop);
  }, [loop]);

  const end = useCallback(
    (revert: boolean) => {
      const d = drag.current;
      if (!d) return;
      clearTimeout(d.timer);
      cancelAnimationFrame(raf.current);
      drag.current = null;
      if (d.phase !== "active") return;
      document.documentElement.style.removeProperty("user-select");
      document.documentElement.style.removeProperty("-webkit-user-select");
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
      if (revert) {
        before.current = new Map([...items.current].map(([k, el]) => [k, { x: el.offsetLeft, y: el.offsetTop }]));
        orderRef.current = d.from;
        setOrder(d.from);
      }
      const el = items.current.get(d.key);
      if (el) {
        const lifted = el.style.transform;
        el.style.transform = "";
        if (lifted && !prefersReducedMotion() && typeof el.animate === "function") el.animate([{ transform: lifted }, { transform: "none" }], SETTLE);
      }
      setDragging(null);
      const now = orderRef.current;
      const name = nameOfRef.current(d.key);
      setAnnouncement(revert ? `${name} put back.` : `${name} dropped at position ${now.indexOf(d.key) + 1} of ${now.length}.`);
      if (!revert) finish(d.from);
    },
    [finish],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointerId) return;
      d.x = e.clientX;
      d.y = e.clientY;
      if (d.phase === "pending") {
        const moved = Math.hypot(d.x - d.startX, d.y - d.startY);
        if (!d.touch && moved > MOUSE_SLOP) activate();
        // a touch that moves before the hold is a scroll, not a drag
        else if (d.touch && moved > TOUCH_SLOP) end(false);
      }
      // follow every move at once (not only on the next frame), so even a quick flick lands where it ends
      if (drag.current?.phase === "active") follow();
    };
    const onUp = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointerId) return;
      d.x = e.clientX;
      d.y = e.clientY;
      if (d.phase === "active") follow();
      end(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drag.current?.phase === "active") end(true);
    };
    // switching away mid-drag drops the card where it is
    const onBlur = () => end(false);
    // once a card is up, the finger moves it instead of scrolling the page
    const onTouchMove = (e: TouchEvent) => {
      if (drag.current?.phase === "active" && e.cancelable) e.preventDefault();
    };
    // a long press would otherwise open the link menu
    const onContextMenu = (e: Event) => {
      if (drag.current) e.preventDefault();
    };
    const ul = list.current;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", onBlur);
    ul?.addEventListener("touchmove", onTouchMove, { passive: false });
    ul?.addEventListener("contextmenu", onContextMenu);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onBlur);
      ul?.removeEventListener("touchmove", onTouchMove);
      ul?.removeEventListener("contextmenu", onContextMenu);
      cancelAnimationFrame(raf.current);
    };
  }, [activate, end, follow]);

  const pointerDown = (key: K) => (e: ReactPointerEvent<HTMLElement>) => {
    if (held || (e.pointerType === "mouse" && e.button !== 0)) return;
    // a new press always starts cleanly, even if an earlier drag never got its release
    if (drag.current) end(false);
    // the handle's keyboard controls and the card's buttons keep their own behaviour on click
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    const el = items.current.get(key);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const touch = e.pointerType !== "mouse";
    drag.current = {
      key,
      pointerId: e.pointerId,
      touch,
      phase: "pending",
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      grabX: e.clientX - r.left,
      grabY: e.clientY - r.top,
      from: [...orderRef.current],
      timer: touch ? window.setTimeout(activate, HOLD_MS) : 0,
    };
  };

  /** Keeps a drag that ended on a card's link from also opening it. */
  const clickCapture = (e: ReactMouseEvent) => {
    if (suppressClick.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  /* --------------------------------------------------------- keyboard */

  const handleKeyDown = (key: K) => (e: ReactKeyboardEvent<HTMLElement>) => {
    const o = orderRef.current;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!held) {
        setHeld({ key, from: [...o] });
        setAnnouncement(`Picked up ${nameOfRef.current(key)}, position ${o.indexOf(key) + 1} of ${o.length}. Use the arrow keys to move it, Space to drop it, Escape to cancel.`);
      } else {
        setHeld(null);
        setAnnouncement(`${nameOfRef.current(key)} dropped at position ${o.indexOf(key) + 1} of ${o.length}.`);
        finish(held.from);
      }
      return;
    }
    if (!held) return;
    if (e.key === "Escape") {
      e.preventDefault();
      before.current = new Map([...items.current].map(([k, el]) => [k, { x: el.offsetLeft, y: el.offsetTop }]));
      orderRef.current = held.from;
      setOrder(held.from);
      setHeld(null);
      setAnnouncement(`${nameOfRef.current(key)} put back at position ${held.from.indexOf(key) + 1}.`);
      return;
    }
    const step = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : 0;
    if (!step) return;
    e.preventDefault();
    const to = o.indexOf(key) + step;
    if (moveTo(key, to)) setAnnouncement(`${nameOfRef.current(key)} moved to position ${to + 1} of ${o.length}.`);
  };

  /** Leaving the handle mid-move drops the card where it is. */
  const handleBlur = (key: K) => () => {
    if (!held || held.key !== key) return;
    // focus comes straight back after a keyboard move; only a real blur drops it
    requestAnimationFrame(() => {
      if (document.activeElement === handles.current.get(key)) return;
      setHeld(null);
      finish(held.from);
    });
  };

  /** Puts the cards in a given order (e.g. the default), gliding, and saves it. */
  const reorderTo = (next: K[]) => {
    if (next.join() === orderRef.current.join()) return;
    const from = orderRef.current;
    before.current = new Map([...items.current].map(([k, el]) => [k, { x: el.offsetLeft, y: el.offsetTop }]));
    orderRef.current = next;
    setOrder(next);
    finish(from);
  };

  return {
    order,
    list,
    dragging,
    held: held?.key ?? null,
    announcement,
    registerItem,
    registerHandle,
    pointerDown,
    clickCapture,
    handleKeyDown,
    handleBlur,
    reorderTo,
  };
}
