"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * For someone with no saved time zone: saves the device's zone once, then
 * reloads the page's data so "Best time to post" is grouped by their own clock.
 * Renders nothing.
 */
export function TimeZoneSync({ needsZone, onSave }: { needsZone: boolean; onSave: (timezone: string) => Promise<void> }) {
  const router = useRouter();
  const sent = useRef(false);
  useEffect(() => {
    if (!needsZone || sent.current) return;
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone) return;
    sent.current = true;
    onSave(zone)
      .then(() => router.refresh())
      .catch(() => {
        // the chart stays in UTC this time; the next visit tries again
        sent.current = false;
      });
  }, [needsZone, onSave, router]);
  return null;
}
