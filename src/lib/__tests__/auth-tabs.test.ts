import { afterEach, describe, expect, it, vi } from "vitest";
import { announceSignIn, signedInPath, waitForSignIn } from "@/lib/auth-tabs";

afterEach(() => vi.useRealTimers());

describe("signing in from another tab", () => {
  it("builds the landing path with the destination encoded", () => {
    expect(signedInPath("/platforms?x=1")).toBe("/signed-in?next=%2Fplatforms%3Fx%3D1");
  });

  it("hands over to a waiting tab, which answers and carries on", async () => {
    const onSignedIn = vi.fn();
    const stop = waitForSignIn(onSignedIn, async () => false, { everyMs: 60_000 });
    expect(await announceSignIn(1000)).toBe(true);
    expect(onSignedIn).toHaveBeenCalledTimes(1);
    stop();
  });

  it("reports that nobody was waiting, so the new tab carries on itself", async () => {
    expect(await announceSignIn(50)).toBe(false);
  });

  it("also notices a sign-in by checking the session, once", async () => {
    vi.useFakeTimers();
    const onSignedIn = vi.fn();
    let signedIn = false;
    const stop = waitForSignIn(onSignedIn, async () => signedIn, { everyMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(onSignedIn).not.toHaveBeenCalled();
    signedIn = true;
    await vi.advanceTimersByTimeAsync(3000);
    expect(onSignedIn).toHaveBeenCalledTimes(1);
    stop();
  });
});
