"use client";

import { useEffect, useId, useRef } from "react";
import { displacementMapUrl, mapSize, type LensShape } from "@/lib/liquidGlass";
import { isIos } from "@/lib/platform";

// content sampled around the bar (px); the curved rim as a share of the bar's height (the bar
// bends like a glass rod, nearly flat only along its middle); the most the rim shifts content, as
// a share of the rim; and a light softening so the glass reads as glass
const MARGIN = 26;
const RIM = 0.44;
const SHIFT = 0.75;
const SOFTEN = 1.4;
// wait for the page to stop changing (a new tab streams in over several commits) before copying it again
const RECOPY_AFTER_MS = 450;

/**
 * Real refraction for a Liquid Glass bar on iPhone and iPad.
 *
 * Safari cannot run SVG filters on what lies behind an element
 * (backdrop-filter: url()), so the bar carries its own live copy of the page:
 * an inert clone of the page column, kept aligned pixel for pixel with the
 * real one as it scrolls or is pulled, and re-copied when the page changes.
 * That copy is bent through an SVG displacement map drawn from the bar's exact
 * shape (src/lib/liquidGlass.ts): flat in the middle, curving at the rim, where
 * content from just beyond the bar is pulled in.
 *
 * Kept cheap so tab switches stay smooth: the bend renders on its own layer,
 * so nothing else repainting in the bar re-runs it; the copy is refreshed only
 * once the page has settled and the browser is idle; and parts of the copy far
 * from the bar skip rendering (content-visibility).
 *
 * Render it as the first child of a `.liquid-glass` element. It switches itself
 * on (data-refract on the bar) only on iOS, when the page column exists and
 * Reduce Transparency is off; otherwise the bar keeps its frosted fallback.
 */
export function LiquidRefraction() {
  const root = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLDivElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const filter = useRef<SVGFilterElement>(null);
  const map = useRef<SVGFEImageElement>(null);
  const id = `lg${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    const bar = root.current?.parentElement;
    const ln = lens.current;
    const mr = mirror.current;
    const fl = filter.current;
    const fm = map.current;
    const source = document.querySelector<HTMLElement>("main[data-pull-refresh]");
    if (!bar || !ln || !mr || !fl || !fm || !source) return;
    if (!isIos() || matchMedia("(prefers-reduced-transparency: reduce)").matches) return;

    let lastX = NaN;
    let lastY = NaN;
    let lastW = NaN;
    /** Lines the copy up with the real page; true if it had to move. */
    const align = () => {
      const a = source.getBoundingClientRect();
      const b = ln.getBoundingClientRect();
      const x = Math.round((a.left - b.left) * 2) / 2;
      const y = Math.round((a.top - b.top) * 2) / 2;
      let moved = false;
      if (a.width !== lastW) {
        lastW = a.width;
        mr.style.width = `${source.offsetWidth}px`;
        moved = true;
      }
      if (x !== lastX || y !== lastY) {
        lastX = x;
        lastY = y;
        mr.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        moved = true;
      }
      return moved;
    };

    const copy = () => {
      const c = source.cloneNode(true) as HTMLElement;
      c.removeAttribute("data-pull-refresh");
      c.removeAttribute("data-anim");
      c.style.transform = "";
      c.removeAttribute("id");
      c.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
      c.setAttribute("inert", "");
      // sections well away from the bar skip layout and paint, holding their real size
      const real = [...source.children].flatMap((n) => [n, ...n.children]) as HTMLElement[];
      const copies = [...c.children].flatMap((n) => [n, ...n.children]) as HTMLElement[];
      copies.forEach((n, i) => {
        const h = real[i]?.offsetHeight;
        if (!h) return;
        n.style.contentVisibility = "auto";
        n.style.containIntrinsicSize = `auto ${h}px`;
      });
      mr.replaceChildren(c);
      align();
    };

    const shape = () => {
      const s: LensShape = {
        width: bar.clientWidth,
        height: bar.clientHeight,
        radius: parseFloat(getComputedStyle(bar).borderTopLeftRadius) || 0,
        margin: MARGIN,
        bezel: bar.clientHeight * RIM,
      };
      if (!s.width || !s.height) return;
      // feDisplacementMap moves by scale × (value − 0.5), so the full rim shift needs twice the distance
      const scale = 2 * Math.min(s.bezel * SHIFT, MARGIN - 2);
      fl.querySelector("feDisplacementMap")?.setAttribute("scale", String(scale));
      const { width, height } = mapSize(s);
      for (const el of [fl, fm]) {
        el.setAttribute("width", String(width));
        el.setAttribute("height", String(height));
      }
      fm.setAttribute("href", displacementMapUrl(s, Math.min(window.devicePixelRatio || 1, 3)));
      align();
    };

    // follow scrolling, pulling and layout shifts frame by frame, resting once nothing moves
    let raf = 0;
    let still = 0;
    const tick = () => {
      still = align() ? 0 : still + 1;
      raf = still < 40 ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => {
      still = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    let pending = 0;
    let idle = 0;
    const ric = window.requestIdleCallback?.bind(window);
    const recopy = () => {
      if (ric) idle = ric(copy, { timeout: 1500 });
      else copy();
    };
    const mo = new MutationObserver((records) => {
      // the column's own style changes every frame of a pull; that is movement, handled by align()
      if (records.every((r) => r.target === source && r.type === "attributes")) return;
      clearTimeout(pending);
      window.cancelIdleCallback?.(idle);
      pending = window.setTimeout(recopy, RECOPY_AFTER_MS);
    });
    const ro = new ResizeObserver(() => {
      shape();
      wake();
    });

    bar.dataset.refract = "true";
    copy();
    shape();
    mo.observe(source, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "style", "d", "data-active", "aria-pressed", "aria-selected", "src"] });
    ro.observe(bar);
    ro.observe(source);
    const opts = { passive: true } as const;
    window.addEventListener("scroll", wake, opts);
    window.addEventListener("resize", wake, opts);
    document.addEventListener("touchstart", wake, opts);
    document.addEventListener("touchmove", wake, opts);
    document.addEventListener("touchend", wake, opts);

    return () => {
      delete bar.dataset.refract;
      cancelAnimationFrame(raf);
      clearTimeout(pending);
      window.cancelIdleCallback?.(idle);
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", wake);
      document.removeEventListener("touchstart", wake);
      document.removeEventListener("touchmove", wake);
      document.removeEventListener("touchend", wake);
      mr.replaceChildren();
    };
  }, []);

  return (
    <div ref={root} className="liquid-refract" aria-hidden="true">
      <div ref={lens} className="liquid-refract-lens" style={{ inset: -MARGIN, filter: `url(#${id})` }}>
        <div ref={mirror} className="liquid-refract-mirror" />
      </div>
      <svg width="0" height="0" className="liquid-refract-defs" focusable="false">
        <filter ref={filter} id={id} x="0" y="0" width="1" height="1" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feImage ref={map} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="map" />
          <feGaussianBlur in="SourceGraphic" stdDeviation={SOFTEN} result="soft" />
          <feDisplacementMap in="soft" in2="map" scale={0} xChannelSelector="R" yChannelSelector="G" result="bent" />
          <feColorMatrix in="bent" type="saturate" values="1.35" />
        </filter>
      </svg>
    </div>
  );
}
