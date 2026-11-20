/**
 * Light / dark theme. The choice lives in localStorage on each device; an inline
 * script in <head> applies it before the first paint so pages never flash.
 */
export type ThemeChoice = "light" | "dark" | "system";
export const THEME_CHOICES: ThemeChoice[] = ["light", "dark", "system"];
export const THEME_KEY = "ispector-theme";

/** Page colour per theme, for the browser's toolbar tint. */
export const THEME_BG = { light: "#f3f2ee", dark: "#0e0e10" } as const;

/**
 * Runs in <head> before anything paints: resolves the stored choice (default
 * light), sets data-theme on <html>, tints the browser bar, and follows the
 * device setting live while the choice is "system".
 */
export const THEME_SCRIPT = `(function(){try{var d=document.documentElement,q=window.matchMedia("(prefers-color-scheme: dark)");function a(){var c=null;try{c=localStorage.getItem(${JSON.stringify(THEME_KEY)})}catch(e){}var t=c==="dark"||(c==="system"&&q.matches)?"dark":"light";d.setAttribute("data-theme",t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="dark"?${JSON.stringify(THEME_BG.dark)}:${JSON.stringify(THEME_BG.light)})}a();q.addEventListener("change",a);window.addEventListener("storage",function(e){if(e.key===${JSON.stringify(THEME_KEY)})a()});window.__applyTheme=a}catch(e){}})()`;

export function readThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "dark" || v === "system" ? v : "light";
  } catch {
    return "light";
  }
}

/** Saves the choice and applies it at once (also to other open tabs, via the storage event). */
export function setThemeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    // private mode: the theme still applies for this page
  }
  const w = window as Window & { __applyTheme?: () => void };
  if (w.__applyTheme) w.__applyTheme();
  else {
    const dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }
}
