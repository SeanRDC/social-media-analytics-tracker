/** True when the person asked their device to reduce motion. Browser only: call it in effects and event handlers. */
export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
