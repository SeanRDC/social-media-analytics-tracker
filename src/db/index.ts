/**
 * Database client.
 * - DATABASE_URL set (Neon in production): postgres.js over the pooled connection string.
 * - DATABASE_URL unset (local development): embedded PGlite stored in .data/pglite,
 *   so the app runs with no external services. `npm run dev` applies migrations first.
 */
import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function create() {
  const url = process.env.DATABASE_URL;
  if (url) {
    // prepare: false keeps it compatible with Neon's pooled (PgBouncer) endpoint
    return drizzlePostgres(postgres(url, { prepare: false, max: 5 }), { schema, casing: "snake_case" });
  }
  const dir = process.env.PGLITE_DIR ?? ".data/pglite";
  mkdirSync(dir, { recursive: true });
  return drizzlePglite(new PGlite(dir), { schema, casing: "snake_case" }) as unknown as ReturnType<typeof drizzlePostgres<typeof schema>>;
}

type Db = ReturnType<typeof create>;

// One client per process, kept across hot reloads in development.
const g = globalThis as unknown as { __db?: Db };
export const db: Db = g.__db ?? (g.__db = create());

export { schema };
