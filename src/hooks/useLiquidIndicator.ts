"use client";

import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from "react";
import { prefersReducedMotion } from "@/lib/motion/reducedMotion";
import { isIos } from "@/lib/platform";

/**
 * The selection capsule of a Liquid Glass tab group (iOS 26 style).
 *
 * Items inside the container carry `data-key` and `data-active`. On iPhone and
 * iPad the capsule runs on springs:
 * - switching tabs, it stretches along its path and lifts into a clear lens
 *   while it travels, then settles back into the bar;
 * - touching the group lifts the lens under the finger; dragging scrubs it
 *   across the tabs, magnifying the one beneath; letting go picks that tab
 *   (`onPick`) at once, before the new page has loaded.
 * Elsewhere, and with Reduce Motion, it simply slides with a CSS transition
 * (the `data-ready` attribute), like useSlidingIndicator.
 *
 * The container must be `position: relative`. The hook writes styles directly,
 * so motion never re-renders the component.
 */
export function useLiquidIndicator<C extends HTMLElement = HTMLDivElement>(activeKey: string | null, onPick: (key: string) => void) {
  const container = useRef<C>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  // tab picked by touch, shown as active until the route catches up
  const [picked, setPicked] = useState<{ key: string; from: string | null } | null>(null);
  const active = picked && picked.from === activeKey ? picked.key : activeKey;

  const engine = useRef<Engine | null>(null);
  const onPickRef = useRef(onPick);
  useLayoutEffect(() => {
    onPickRef.current = onPick;
  });

  useLayoutEffect(() => {
    const c = container.current;
    const ind = indicator.current;
    if (!c || !ind) return;
    const e = new Engine(c, ind, isIos() && !prefersReducedMotion());
    engine.current = e;
    const ro = new ResizeObserver(() => e.settle());
    ro.observe(c);
    return () => {
      ro.disconnect();
      e.stop();
      engine.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    engine.current?.retarget(active);
  }, [active]);

  const pick = (key: string) => {
    setPicked({ key, from: activeKey });
    onPickRef.current(key);
  };

  const handlers = {
    onPointerDown: (ev: ReactPointerEvent<C>) => {
      if (ev.pointerType === "mouse" || !ev.isPrimary) return;
      engine.current?.press(ev.clientX);
    },
    onPointerMove: (ev: ReactPointerEvent<C>) => {
      if (ev.isPrimary) engine.current?.drag(ev.clientX);
    },
    onPointerUp: (ev: ReactPointerEvent<C>) => {
      if (!ev.isPrimary) return;
      const key = engine.current?.release();
      if (key) pick(key);
    },
    onPointerCancel: () => engine.current?.cancel(),
    // a touch was already handled on release; don't let the link navigate a second time
    onClickCapture: (ev: ReactMouseEvent<C>) => {
      if (engine.current?.consumeClick()) ev.preventDefault();
    },
  };

  return { container, indicator, active, handlers };
}

/* ---------------------------------------------------------------- springs */

interface Spring {
  x: number;
  v: number;
}

/** Semi-implicit Euler step of a damped spring towards `to`. */
function step(s: Spring, to: number, k: number, c: number, dt: number) {
  s.v += (-k * (s.x - to) - c * s.v) * dt;
  s.x += s.v * dt;
}

// travel: about UIKit's response 0.35 s, damping 0.8 (a whisper of overshoot)
const TRAVEL = { k: 340, c: 30 };
// following a finger: stiff enough to stay under it, still soft at the edges
const FOLLOW = { k: 1600, c: 80 };
const LIFT = { k: 420, c: 34 };
// how far the lens grows past the bar when lifted, and how much the tab under it is magnified
const LENS_SCALE = 0.2;
const DRAG_SLOP = 6;

class Engine {
  private x: Spring = { x: 0, v: 0 };
  private w: Spring = { x: 0, v: 0 };
  private lift: Spring = { x: 0, v: 0 };
  private tx = 0;
  private tw = 0;
  private y = 0;
  private h = 0;
  private key: string | null = null;
  private raf = 0;
  private last = 0;
  private pressed = false;
  private downX = 0;
  private dragged = false;
  private touched = false;
  private lensed: HTMLElement | null = null;

  constructor(
    private c: HTMLElement,
    private ind: HTMLSpanElement,
    private liquid: boolean,
  ) {}

  private items() {
    return Array.from(this.c.querySelectorAll<HTMLElement>("[data-key]"));
  }

  private find(key: string | null) {
    return this.items().find((el) => el.dataset.key === key) ?? null;
  }

  /** The item whose box is nearest to a viewport x. */
  private nearest(clientX: number) {
    const left = this.c.getBoundingClientRect().left;
    let best: HTMLElement | null = null;
    let dist = Infinity;
    for (const el of this.items()) {
      const d = Math.abs(left + el.offsetLeft + el.offsetWidth / 2 - clientX);
      if (d < dist) [best, dist] = [el, d];
    }
    return best;
  }

  private measure(el: HTMLElement) {
    this.tx = el.offsetLeft;
    this.tw = el.offsetWidth;
    this.y = el.offsetTop;
    this.h = el.offsetHeight;
  }

  /** The active tab changed (route or pick). */
  retarget(key: string | null) {
    this.key = key;
    const el = this.find(key);
    if (!el) {
      this.ind.style.opacity = "0";
      return;
    }
    this.ind.style.opacity = "1";
    const first = this.w.x === 0;
    this.measure(el);
    if (first || !this.liquid) {
      this.snap();
      // without springs, enable the CSS slide only after the first placement, so it doesn't fly in from a corner
      if (!this.liquid) requestAnimationFrame(() => (this.ind.dataset.ready = "true"));
      return;
    }
    if (!this.pressed) this.run();
  }

  /** Layout changed: jump straight to the active tab. */
  settle() {
    const el = this.find(this.key);
    if (!el || this.pressed) return;
    this.measure(el);
    this.snap();
  }

  private snap() {
    this.x = { x: this.tx, v: 0 };
    this.w = { x: this.tw, v: 0 };
    this.lift = { x: 0, v: 0 };
    this.paint();
  }

  press(clientX: number) {
    if (!this.liquid) return;
    this.pressed = true;
    this.touched = true;
    this.dragged = false;
    this.downX = clientX;
    this.c.dataset.pressed = "true";
    this.follow(clientX);
  }

  drag(clientX: number) {
    if (!this.pressed) return;
    if (Math.abs(clientX - this.downX) > DRAG_SLOP) this.dragged = true;
    this.follow(clientX);
  }

  private follow(clientX: number) {
    const under = this.nearest(clientX);
    if (!under) return;
    const left = this.c.getBoundingClientRect().left;
    const max = this.c.clientWidth - under.offsetWidth;
    this.tw = under.offsetWidth;
    this.y = under.offsetTop;
    this.h = under.offsetHeight;
    // a plain tap snaps onto the tab; a drag keeps the lens centred under the finger
    this.tx = this.dragged ? Math.min(Math.max(clientX - left - this.tw / 2, 0), max) : under.offsetLeft;
    this.run();
  }

  /** Finger lifted: returns the tab to pick, if any. */
  release(): string | null {
    if (!this.pressed) return null;
    this.pressed = false;
    delete this.c.dataset.pressed;
    // where the lens is heading (a quick tap releases before the spring arrives)
    const under = this.nearest(this.tx + this.c.getBoundingClientRect().left + this.tw / 2);
    const key = under?.dataset.key ?? null;
    if (under) this.measure(under);
    this.run();
    return key && key !== this.key ? key : null;
  }

  cancel() {
    if (!this.pressed) return;
    this.pressed = false;
    this.touched = false;
    delete this.c.dataset.pressed;
    this.retarget(this.key);
  }

  /** True once after a touch, so the click the browser sends afterwards is ignored. */
  consumeClick() {
    const t = this.touched;
    this.touched = false;
    return t;
  }

  private run() {
    if (this.raf) return;
    this.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - this.last) / 1000, 1 / 30);
      this.last = now;
      const spring = this.pressed ? FOLLOW : TRAVEL;
      step(this.x, this.tx, spring.k, spring.c, dt);
      step(this.w, this.tw, spring.k, spring.c, dt);
      // the capsule lifts into a lens while held, or while it is still travelling
      const travelling = Math.abs(this.x.x - this.tx) > 3;
      step(this.lift, this.pressed || travelling ? 1 : 0, LIFT.k, LIFT.c, dt);
      this.paint();
      const still =
        Math.abs(this.x.x - this.tx) < 0.25 &&
        Math.abs(this.x.v) < 4 &&
        Math.abs(this.w.x - this.tw) < 0.25 &&
        Math.abs(this.lift.x) < 0.005 &&
        Math.abs(this.lift.v) < 0.05;
      if (still && !this.pressed) {
        this.raf = 0;
        this.snap();
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private paint() {
    const lift = Math.max(0, this.lift.x);
    // stretch along the direction of travel, thinning a little, like a drop of liquid
    const stretch = Math.min(Math.abs(this.x.v) / 3200, 0.22);
    const grow = 1 + LENS_SCALE * lift;
    const sx = (1 + stretch) * grow;
    const sy = (1 - stretch * 0.45) * grow;
    const s = this.ind.style;
    s.width = `${this.w.x}px`;
    s.height = `${this.h}px`;
    s.transform = `translate(${this.x.x}px, ${this.y}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
    s.setProperty("--lift", lift.toFixed(3));

    // magnify the tab under the lens
    const center = this.x.x + this.w.x / 2;
    let under: HTMLElement | null = null;
    if (lift > 0.35) {
      under = this.items().find((el) => center >= el.offsetLeft && center <= el.offsetLeft + el.offsetWidth) ?? null;
    }
    if (under !== this.lensed) {
      if (this.lensed) delete this.lensed.dataset.lensed;
      if (under) under.dataset.lensed = "true";
      this.lensed = under;
    }
  }
}
