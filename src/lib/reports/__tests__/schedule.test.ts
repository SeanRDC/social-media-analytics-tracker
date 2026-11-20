import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { saveConnection } from "@/lib/connect/service";
import { renderReportEmail } from "@/lib/reports/email";
import { getSavedTimeZone, getSchedule, isDue, lastOccurrence, rememberTimeZone, saveScheduleFor, sendWeeklyReports } from "@/lib/reports/schedule";
import { syncConnection } from "@/lib/sync/service";

const MON_9_MANILA = { dayOfWeek: 1, hour: 9, timezone: "Asia/Manila" };

describe("lastOccurrence", () => {
  it("finds this week's slot once it has passed in the person's time zone", () => {
    // Monday 2026-11-16 10:30 in Manila (UTC+8)
    expect(lastOccurrence(MON_9_MANILA, new Date("2026-11-16T02:30:00Z")).toISOString()).toBe("2026-11-16T01:00:00.000Z");
  });

  it("goes back a week when today's slot is still ahead", () => {
    // Monday 08:00 in Manila
    expect(lastOccurrence(MON_9_MANILA, new Date("2026-11-16T00:00:00Z")).toISOString()).toBe("2026-11-09T01:00:00.000Z");
  });

  it("falls back to UTC for an unknown time zone", () => {
    expect(lastOccurrence({ dayOfWeek: 1, hour: 9, timezone: "Mars/Olympus" }, new Date("2026-11-16T09:00:00Z")).toISOString()).toBe("2026-11-16T09:00:00.000Z");
  });
});

describe("isDue", () => {
  const s = { enabled: true, ...MON_9_MANILA };
  const now = new Date("2026-11-16T02:30:00Z");
  it("is due when nothing went out since the last slot", () => {
    expect(isDue(s, new Date("2026-11-09T02:00:00Z"), now)).toBe(true);
    expect(isDue(s, null, now)).toBe(true);
  });
  it("is not due again once sent", () => {
    expect(isDue(s, new Date("2026-11-16T01:30:00Z"), now)).toBe(false);
  });
  it("is never due when switched off", () => {
    expect(isDue({ ...s, enabled: false }, null, now)).toBe(false);
  });
});

describe("weekly email", () => {
  let db: Db;
  beforeAll(async () => {
    const pg = drizzle(new PGlite(), { schema, casing: "snake_case" });
    await migrate(pg, { migrationsFolder: "drizzle" });
    db = pg as unknown as Db;
  }, 30_000);
  beforeEach(async () => {
    await db.delete(schema.user);
    await db.insert(schema.user).values({ id: "u1", name: "A", email: "a@example.com" });
  });
  afterEach(() => vi.restoreAllMocks());

  it("is off by default", async () => {
    expect(await getSchedule("u1", db)).toMatchObject({ enabled: false });
  });

  it("remembers a device's time zone once, without turning the email on or overriding a chosen zone", async () => {
    expect(await getSavedTimeZone("u1", db)).toBeNull();
    await rememberTimeZone(db, "u1", "Asia/Manila");
    expect(await getSavedTimeZone("u1", db)).toBe("Asia/Manila");
    expect(await getSchedule("u1", db)).toMatchObject({ enabled: false, timezone: "Asia/Manila" });
    // travelling: a later device zone doesn't move it
    await rememberTimeZone(db, "u1", "Europe/London");
    expect(await getSavedTimeZone("u1", db)).toBe("Asia/Manila");
  });

  it("stores UTC for a time zone the browser made up", async () => {
    await rememberTimeZone(db, "u1", "Not/AZone");
    expect(await getSavedTimeZone("u1", db)).toBe("UTC");
  });

  it("sends once per week, and only to people with imported numbers", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const saved = new Date("2026-11-15T00:00:00Z");
    await saveScheduleFor(db, "u1", { enabled: true, ...MON_9_MANILA }, saved);
    const monday = new Date("2026-11-16T02:30:00Z");

    // nothing imported yet: skipped
    expect(await sendWeeklyReports(db, monday)).toEqual({ sent: 0, skipped: 1, failed: 0 });

    const id = await saveConnection(db, "u1", "youtube", { accessToken: "a", refreshToken: null, expiresAt: null, scopes: null }, { externalId: "simulated:youtube", name: "Sample" });
    await syncConnection(db, id, new Date("2026-11-16T00:00:00Z"));
    expect(await sendWeeklyReports(db, monday, "https://app.example")).toEqual({ sent: 1, skipped: 0, failed: 0 });
    expect(log.mock.calls.flat().join("\n")).toContain("To a@example.com: Your week:");
    expect(await sendWeeklyReports(db, new Date("2026-11-16T05:00:00Z"))).toEqual({ sent: 0, skipped: 0, failed: 0 });
    const [row] = await db.select().from(schema.reportSchedule).where(eq(schema.reportSchedule.userId, "u1"));
    expect(row.lastSentAt?.toISOString()).toBe(monday.toISOString());
  });

  it("waits for next week when saved after this week's slot", async () => {
    await saveScheduleFor(db, "u1", { enabled: true, ...MON_9_MANILA }, new Date("2026-11-16T03:00:00Z"));
    const id = await saveConnection(db, "u1", "youtube", { accessToken: "a", refreshToken: null, expiresAt: null, scopes: null }, { externalId: "simulated:youtube", name: "Sample" });
    await syncConnection(db, id, new Date("2026-11-16T00:00:00Z"));
    expect((await sendWeeklyReports(db, new Date("2026-11-16T04:00:00Z"))).sent).toBe(0);
  });

  it("escapes report text in the email", () => {
    const { html } = renderReportEmail({ id: "weekly", title: "Weekly", period: "Last 7 days · x", sections: [{ heading: "Best post", columns: ["Title"], rows: [["<script>alert(1)</script>"]] }] }, "");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
