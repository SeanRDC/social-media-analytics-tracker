import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { lastRun, runJob } from "@/lib/jobs";

let db: Db;
beforeAll(async () => {
  const pg = drizzle(new PGlite(), { schema, casing: "snake_case" });
  await migrate(pg, { migrationsFolder: "drizzle" });
  db = pg as unknown as Db;
}, 30_000);
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("runJob", () => {
  it("never runs the same job twice at once", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    let release!: () => void;
    const first = runJob(db, "nightly", 60, () => new Promise<number>((r) => (release = () => r(1))));
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    expect(await runJob(db, "nightly", 60, async () => 2)).toEqual({ ran: false, reason: "already-running" });
    release();
    expect(await first).toMatchObject({ ran: true, ok: true, result: 1 });
    // lease released: the next run goes ahead
    expect(await runJob(db, "nightly", 60, async () => 3)).toMatchObject({ ran: true, result: 3 });
  });

  it("takes over a lease left behind by a crashed run", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    await db.insert(schema.jobLease).values({ name: "stale", holder: "dead", lockedUntil: new Date(Date.now() - 1000) });
    expect(await runJob(db, "stale", 60, async () => "ok")).toMatchObject({ ran: true });
  });

  it("records each run and calls the webhook when one fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("ALERT_WEBHOOK_URL", "https://hooks.example/x");
    const hook = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", hook);
    const out = await runJob(db, "flaky", 60, async () => ({ failed: 2 }), (r) => r.failed === 0);
    expect(out).toMatchObject({ ran: true, ok: false });
    const run = await lastRun(db, "flaky");
    expect(run).toMatchObject({ ok: false, summary: '{"failed":2}' });
    expect(run?.finishedAt).toBeInstanceOf(Date);
    expect(String((hook.mock.calls[0] as unknown[])[0])).toBe("https://hooks.example/x");
  });

  it("records a crash as a failed run instead of throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await runJob(db, "crash", 60, async () => Promise.reject(new Error("boom")))).toMatchObject({ ran: true, ok: false, error: "boom" });
  });
});
