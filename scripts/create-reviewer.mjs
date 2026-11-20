// Creates (or resets the password of) the one account platform app reviewers sign in with.
// Reviewers at Meta, TikTok, LinkedIn and Google can't receive our sign-in emails, so they
// get an email + password instead. Nobody can sign up with a password; this script is the
// only way such an account comes to exist.
//
// Usage (local):      REVIEWER_EMAIL=... REVIEWER_PASSWORD=... node scripts/create-reviewer.mjs
// Usage (production): set DATABASE_URL to the Neon URL as well.
// The password needs at least 16 characters. The site also needs REVIEWER_EMAIL set
// (in Vercel for production) so the reviewer sign-in form appears.
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

const email = (process.env.REVIEWER_EMAIL ?? "").trim().toLowerCase();
const password = process.env.REVIEWER_PASSWORD ?? "";
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Set REVIEWER_EMAIL to the reviewer account's email address.");
  process.exit(1);
}
if (password.length < 16) {
  console.error("Set REVIEWER_PASSWORD to at least 16 characters (for example: openssl rand -base64 18).");
  process.exit(1);
}

const { hashPassword } = await import("better-auth/crypto");
const hash = await hashPassword(password);

/** Runs the statements on Neon (DATABASE_URL) or the local PGlite database, like scripts/migrate.mjs. */
async function withDb(fn) {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: url.replace(/([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/, "$1verify-full") });
    await client.connect();
    try {
      return await fn((text, params) => client.query(text, params).then((r) => r.rows));
    } finally {
      await client.end();
    }
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR ?? ".data/pglite";
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  try {
    return await fn((text, params) => client.query(text, params).then((r) => r.rows));
  } finally {
    await client.close();
  }
}

const created = await withDb(async (q) => {
  const now = new Date();
  let [u] = await q(`select id from "user" where email = $1`, [email]);
  const isNew = !u;
  if (isNew) {
    u = { id: randomUUID() };
    await q(`insert into "user" (id, name, email, email_verified, created_at, updated_at) values ($1, $2, $3, true, $4, $4)`, [u.id, "App Reviewer", email, now]);
  }
  const [acct] = await q(`select id from account where user_id = $1 and provider_id = 'credential'`, [u.id]);
  if (acct) await q(`update account set password = $1, updated_at = $2 where id = $3`, [hash, now, acct.id]);
  else await q(`insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at) values ($1, $2, 'credential', $2, $3, $4, $4)`, [randomUUID(), u.id, hash, now]);
  // a new password signs out any earlier reviewer sessions
  if (!isNew) await q(`delete from session where user_id = $1`, [u.id]);
  return isNew;
});

console.log(created ? `Reviewer account created for ${email}.` : `Reviewer password reset for ${email}.`);
console.log(process.env.DATABASE_URL ? "Database: DATABASE_URL." : "Database: local PGlite.");
