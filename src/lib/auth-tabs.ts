/**
 * Signing in with an email link opens a new tab (email apps always do). These
 * helpers let that tab tell the original "check your email" tab that sign-in
 * is done, so the original tab carries on by itself. Browser only.
 */

/**
 * Only same-site paths are allowed as a post-sign-in destination. Browsers read
 * "/\evil.com" like "//evil.com", so backslashes and control characters are refused too.
 */
export function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/overview";
  const unsafe = (c: string) => c === "\\" || c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f;
  if ([...raw].some(unsafe)) return "/overview";
  return raw;
}

const CHANNEL = "ispector-auth";

type Message = { type: "signed-in" } | { type: "continued" };

/** The page reached from the email link: lands here, then goes on to `next`. */
export const signedInPath = (next: string) => `/signed-in?next=${encodeURIComponent(next)}`;

/**
 * From the tab the email link opened: tells other Ispector tabs that sign-in is
 * done. Resolves true when one of them answers that it has carried on, false
 * after `waitMs` with no answer (no tab was waiting, e.g. the email was opened
 * on another device).
 */
export function announceSignIn(waitMs = 1200): Promise<boolean> {
  if (typeof BroadcastChannel === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const ch = new BroadcastChannel(CHANNEL);
    const done = (answered: boolean) => {
      clearTimeout(timer);
      ch.close();
      resolve(answered);
    };
    const timer = setTimeout(() => done(false), waitMs);
    ch.onmessage = (e: MessageEvent<Message>) => {
      if (e.data?.type === "continued") done(true);
    };
    ch.postMessage({ type: "signed-in" } satisfies Message);
  });
}

/**
 * From the waiting "check your email" tab: calls `onSignedIn` once, when the
 * email link is opened in another tab of this browser (instant), or when a
 * periodic session check finds the person signed in (covers browsers without
 * BroadcastChannel). Returns a function that stops listening.
 */
export function waitForSignIn(onSignedIn: () => void, isSignedIn: () => Promise<boolean>, { everyMs = 3000, forMs = 10 * 60 * 1000 } = {}): () => void {
  let stopped = false;
  const ch = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL);
  const finish = () => {
    if (stopped) return;
    stop();
    onSignedIn();
  };
  if (ch) {
    ch.onmessage = (e: MessageEvent<Message>) => {
      if (e.data?.type !== "signed-in") return;
      ch.postMessage({ type: "continued" } satisfies Message);
      finish();
    };
  }
  const check = () => {
    if (stopped || document.visibilityState === "hidden") return;
    isSignedIn()
      .then((yes) => yes && finish())
      .catch(() => {});
  };
  const timer = setInterval(check, everyMs);
  const giveUp = setTimeout(() => stop(), forMs);
  document.addEventListener("visibilitychange", check);
  function stop() {
    stopped = true;
    clearInterval(timer);
    clearTimeout(giveUp);
    document.removeEventListener("visibilitychange", check);
    ch?.close();
  }
  return stop;
}
