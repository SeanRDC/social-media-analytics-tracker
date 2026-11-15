import { defineConfig } from "drizzle-kit";

// Migrations are generated from src/db/schema.ts into ./drizzle.
// Applying them is done by scripts/migrate.mjs, which works for Neon (DATABASE_URL) and local PGlite alike.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
});
