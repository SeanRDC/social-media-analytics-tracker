/**
 * Database client.
 * - DATABASE_URL set (Neon in production): node-postgres pool over the pooled
 *   connection string, registered with Vercel so idle connections are closed
 *   before a function instance is suspended.
 * - DATABASE_URL unset (local development): embedded PGlite stored in .data/pglite,
 *   so the app runs with no external services. `npm run dev` applies migrations first.
 */
import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { logEvent } from "@/lib/log";
import { ResilientPool } from "./resilient-pool";
import * as schema from "./schema";

/**
 * Keeps today's certificate checking explicit: pg treats sslmode=require as
 * verify-full now but will weaken it to libpq's meaning in its next major version.
 */
export function withStrictSsl(url: string): string {
  return url.replace(/([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/, "$1verify-full");
}

function create() {
  const url = process.env.DATABASE_URL;
  if (url) {
    // stays awake while a connection is in use and retries one that failed to open (see resilient-pool.ts)
    const pool = new ResilientPool({
      connectionString: withStrictSsl(url),
      max: 5,
      // Vercel suspends instances between requests; short-lived idle connections
      // (closed by attachDatabasePool before suspension) avoid stale sockets and
      // the instant CONNECT_TIMEOUTs postgres.js produced after a resume
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 10_000,
    });
    attachDatabasePool(pool);
    // an idle client dropped by the server must not crash the process
    pool.on("error", (e) => logEvent("warn", "db_pool_error", { message: e.message.slice(0, 200) }));
    return drizzleNodePg({ client: pool, schema, casing: "snake_case" });
  }
  const dir = process.env.PGLITE_DIR ?? ".data/pglite";
  mkdirSync(dir, { recursive: true });
  return drizzlePglite(new PGlite(dir), { schema, casing: "snake_case" }) as unknown as ReturnType<typeof drizzleNodePg<typeof schema>>;
}

export type Db = ReturnType<typeof create>;

/** One client per process, created on first use and kept across hot reloads. */
export function getDb(): Db {
  const g = globalThis as unknown as { __db?: Db };
  return (g.__db ??= create());
}

export { schema };
