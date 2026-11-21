"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { LOGO } from "@/components/icons/Icon";
import { prefersReducedMotion } from "@/lib/motion/reducedMotion";
import s from "./PullToRefresh.module.css";

// how far the page must be pulled (after resistance) to refresh, where it rests while refreshing, and the most it moves
const TRIGGER = 72;
const HOLD = 60;
const MAX = 132;
// keep the loader up long enough to be seen, even when the refresh is instant
const MIN_SPIN_MS = 900;

type Phase = "idle" | "refreshing" | "done";

/**
 * The page column, with pull-to-refresh on touch screens (phones and tablets,
 * either orientation). Pulling down at the top of the page draws the logo: its
 * arch traces in with the pull and the eye pops in once letting go will
 * refresh. While the page reloads its data (router.refresh) a light sweeps
 * across the arch; when it is done the logo blinks away and the page settles.
 */
export function PullToRefresh({ className, children }: { className?: string; children: ReactNode }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [pending, startTransition] = useTransition();
  const main = useRef<HTMLElement>(null);
  const loader = useRef<HTMLDivElement>(null);
  const started = useRef(0);

  // touch tracking: direct DOM writes, no re-render per frame
  useEffect(() => {
    const el = main.current;
    const ld = loader.current;
    if (!el || !ld) return;
    let startX = 0;
    let startY = 0;
    let pulling = false;
    let tracking = false;
    let distance = 0;
    let armed = false;

    const paint = (d: number, animate: boolean) => {
      distance = d;
      el.dataset.anim = String(animate);
      ld.dataset.anim = String(animate);
      el.style.transform = d ? `translate3d(0, ${d}px, 0)` : "";
      ld.style.setProperty("--pull", String(Math.min(d / TRIGGER, 1)));
      ld.style.setProperty("--d", `${d}px`);
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || el.dataset.busy === "true") return;
      if (!matchMedia("(pointer: coarse)").matches || window.scrollY > 0 || scrolledInside(e.target, el)) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
      pulling = false;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (!pulling) {
        // a sideways swipe or an upward scroll is not a pull
        if (Math.abs(dx) > Math.abs(dy) || dy <= 0 || window.scrollY > 0) {
          if (Math.abs(dx) > 8 || dy < -4) tracking = false;
          return;
        }
        if (dy < 6) return;
        pulling = true;
        startY = e.touches[0].clientY;
      }
      if (e.cancelable) e.preventDefault();
      const pull = Math.max(0, e.touches[0].clientY - startY);
      // rubber band: follows the finger at first, then stiffens towards MAX
      const d = MAX * (1 - Math.exp(-pull / MAX));
      paint(d, false);
      const nowArmed = d >= TRIGGER;
      if (nowArmed !== armed) {
        armed = nowArmed;
        ld.dataset.armed = String(armed);
        if (armed) navigator.vibrate?.(8);
      }
    };

    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      if (!pulling) return;
      pulling = false;
      if (distance >= TRIGGER) {
        el.dataset.busy = "true";
        paint(HOLD, true);
        started.current = performance.now();
        setPhase("refreshing");
        startTransition(() => router.refresh());
      } else {
        paint(0, true);
      }
      armed = false;
      ld.dataset.armed = "false";
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  // refresh finished: hold the loader for its minimum time, blink it away, then let the page settle
  useEffect(() => {
    if (phase === "refreshing" && !pending) {
      const wait = Math.max(0, MIN_SPIN_MS - (performance.now() - started.current));
      const t = setTimeout(() => setPhase("done"), wait);
      return () => clearTimeout(t);
    }
    if (phase === "done") {
      const el = main.current;
      const ld = loader.current;
      const t = setTimeout(
        () => {
          if (el && ld) {
            el.dataset.anim = ld.dataset.anim = "true";
            el.style.transform = "";
            ld.style.setProperty("--pull", "0");
            ld.style.setProperty("--d", "0px");
            delete el.dataset.busy;
          }
          setPhase("idle");
        },
        prefersReducedMotion() ? 0 : 260,
      );
      return () => clearTimeout(t);
    }
  }, [phase, pending]);

  return (
    <>
      <div ref={loader} className={s.loader} data-phase={phase} aria-hidden="true">
        <span className={s.badge}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path className={s.arch} d={LOGO.arch} pathLength={1} />
            <path className={s.sweep} d={LOGO.arch} pathLength={1} />
            <circle className={s.eye} cx={LOGO.eye.cx} cy={LOGO.eye.cy} r={LOGO.eye.r} />
          </svg>
        </span>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {phase === "refreshing" ? "Refreshing" : ""}
      </p>
      <main ref={main} className={`${className ?? ""} ${s.page}`} data-pull-refresh="">
        {children}
      </main>
    </>
  );
}

/** True when the touch began inside something that is itself scrolled down (a list in a sheet, say). */
function scrolledInside(target: EventTarget | null, root: HTMLElement) {
  for (let n = target as HTMLElement | null; n && n !== root; n = n.parentElement) {
    if (n.scrollTop > 0) return true;
  }
  return false;
}
