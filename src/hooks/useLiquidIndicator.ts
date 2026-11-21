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
const FRAME = 1 / 60;
const MAX_STEP = 1 / 240;

interface Motion {
  x: Spring;
  w: Spring;
  lift: Spring;
}

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
  private anims: Animation[] = [];
  private frames: Motion[] = [];
  private started = 0;
  // the capsule's two faces: the resting tint and the lifted lens
  private base: HTMLElement | null;
  private glass: HTMLElement | null;

  constructor(
    private c: HTMLElement,
    private ind: HTMLSpanElement,
    private liquid: boolean,
  ) {
    this.base = ind.querySelector(".liquid-lens-base");
    this.glass = ind.querySelector(".liquid-lens-glass");
  }

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
    if (!this.pressed) this.play();
  }

  /** Layout changed: jump straight to the active tab. */
  settle() {
    const el = this.find(this.key);
    if (!el || this.pressed) return;
    this.measure(el);
    this.snap();
  }

  private snap() {
    this.halt(false);
    this.snapTo();
  }

  /** Puts the capsule at rest on the target. */
  private snapTo() {
    this.x = { x: this.tx, v: 0 };
    this.w = { x: this.tw, v: 0 };
    this.lift = { x: 0, v: 0 };
    this.paint(this.state);
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

  /** Finger-following mode: springs stepped frame by frame, so the lens can track a moving target. */
  private run() {
    this.halt();
    if (this.raf) return;
    this.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - this.last) / 1000, 1 / 30);
      this.last = now;
      this.advance(this.state, dt, this.pressed);
      this.paint(this.state);
      this.magnify(this.state);
      if (!this.pressed) {
        // finger lifted: hand the rest of the motion to the compositor
        this.raf = 0;
        this.play();
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private get state(): Motion {
    return { x: this.x, w: this.w, lift: this.lift };
  }

  /** One spring step. The capsule lifts into a lens while held, or while it is still travelling. */
  private advance(m: Motion, dt: number, pressed: boolean) {
    const spring = pressed ? FOLLOW : TRAVEL;
    // small sub-steps keep the stiff springs stable even when a frame arrives late (a busy page load)
    const n = Math.ceil(dt / MAX_STEP);
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      step(m.x, this.tx, spring.k, spring.c, h);
      step(m.w, this.tw, spring.k, spring.c, h);
      const travelling = Math.abs(m.x.x - this.tx) > 3;
      step(m.lift, pressed || travelling ? 1 : 0, LIFT.k, LIFT.c, h);
    }
  }

  private settled(m: Motion) {
    return (
      Math.abs(m.x.x - this.tx) < 0.25 &&
      Math.abs(m.x.v) < 4 &&
      Math.abs(m.w.x - this.tw) < 0.25 &&
      Math.abs(m.lift.x) < 0.005 &&
      Math.abs(m.lift.v) < 0.05
    );
  }

  /**
   * Travel mode: simulates the whole spring motion up front and plays it as a
   * Web Animation of transform and opacity only. iOS runs those on the
   * compositor, so the capsule stays smooth while the new page is being built
   * on the main thread.
   */
  private play() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.halt();
    this.magnify(null);
    const sim: Motion = { x: { ...this.x }, w: { ...this.w }, lift: { ...this.lift } };
    const frames: Motion[] = [];
    for (let i = 0; i < 240 && !this.settled(sim); i++) {
      this.advance(sim, FRAME, false);
      frames.push({ x: { ...sim.x }, w: { ...sim.w }, lift: { ...sim.lift } });
    }
    this.snapTo(); // the resting state, which the animation lands on
    if (!frames.length || typeof this.ind.animate !== "function") return;
    const opts: KeyframeAnimationOptions = { duration: frames.length * FRAME * 1000, easing: "linear" };
    this.anims = [
      this.ind.animate(frames.map((f) => ({ transform: this.transformFor(f) })), opts),
      ...(this.base ? [this.base.animate(frames.map((f) => ({ opacity: 1 - Math.max(0, f.lift.x) })), opts)] : []),
      ...(this.glass ? [this.glass.animate(frames.map((f) => ({ opacity: Math.max(0, f.lift.x) })), opts)] : []),
    ];
    this.frames = frames;
    this.started = performance.now();
    this.anims[0].onfinish = () => this.halt(false);
  }

  /** Stops a playing travel animation, taking over from wherever it had got to. */
  private halt(resume = true) {
    if (!this.anims.length) return;
    if (resume && this.frames.length) {
      const i = Math.min(Math.floor((performance.now() - this.started) / (FRAME * 1000)), this.frames.length - 1);
      const f = this.frames[i];
      this.x = { ...f.x };
      this.w = { ...f.w };
      this.lift = { ...f.lift };
      this.paint(this.state);
    }
    this.anims.forEach((a) => a.cancel());
    this.anims = [];
    this.frames = [];
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.halt(false);
  }

  /**
   * The capsule keeps the target tab's width as its box and reaches any other
   * width by scaling, so moving it never triggers layout.
   */
  private transformFor(m: Motion) {
    const lift = Math.max(0, m.lift.x);
    // stretch along the direction of travel, thinning a little, like a drop of liquid
    const stretch = Math.min(Math.abs(m.x.v) / 3200, 0.22);
    const grow = 1 + LENS_SCALE * lift;
    const tw = this.tw || 1;
    const sx = (m.w.x / tw) * (1 + stretch) * grow;
    const sy = (1 - stretch * 0.45) * grow;
    const x = m.x.x + (m.w.x - tw) / 2;
    return `translate(${x.toFixed(2)}px, ${this.y}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
  }

  private paint(m: Motion) {
    const s = this.ind.style;
    const box = `${this.tw}px`;
    if (s.width !== box) s.width = box;
    const h = `${this.h}px`;
    if (s.height !== h) s.height = h;
    s.transform = this.transformFor(m);
    const lift = Math.max(0, m.lift.x);
    if (this.base) this.base.style.opacity = String(1 - lift);
    if (this.glass) this.glass.style.opacity = String(lift);
  }

  /** Magnifies the tab under the lens (finger-following mode only). */
  private magnify(m: Motion | null) {
    let under: HTMLElement | null = null;
    if (m && m.lift.x > 0.35) {
      const center = m.x.x + m.w.x / 2;
      under = this.items().find((el) => center >= el.offsetLeft && center <= el.offsetLeft + el.offsetWidth) ?? null;
    }
    if (under !== this.lensed) {
      if (this.lensed) delete this.lensed.dataset.lensed;
      if (under) under.dataset.lensed = "true";
      this.lensed = under;
    }
  }
}
