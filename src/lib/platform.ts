/**
 * Which device family the page runs on, decided once by an inline script in
 * <head> before the first paint, so iOS-only styling (the glass navigation)
 * never flashes in. Components read the result from the <html> element.
 */

/**
 * Sets data-ios="true" on <html> for iPhone and iPad. iPadOS reports itself as
 * a Mac, so a Mac with a touch screen counts as an iPad.
 */
export const PLATFORM_SCRIPT = `(function(){try{var n=navigator;if(/iPhone|iPad|iPod/.test(n.userAgent)||(n.platform==="MacIntel"&&n.maxTouchPoints>1))document.documentElement.setAttribute("data-ios","true")}catch(e){}})()`;

/** True on iPhone and iPad (browser only; set by PLATFORM_SCRIPT). */
export const isIos = () => document.documentElement.dataset.ios === "true";
