/**
 * Database schema. Auth tables follow Better Auth's core schema (v1.7);
 * the rest store connections and the daily snapshots the dashboard reads.
 */
import { bigint, boolean, date, index, integer, pgTable, primaryKey, real, text, timestamp, unique } from "drizzle-orm/pg-core";
import type { ConnectionStatus, PlatformId, PostKind } from "@/lib/data/types";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const uuid = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

/* ---------------- auth (Better Auth) ---------------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* ---------------- platform connections ---------------- */

/** One connected social account. v1: one per platform per user. */
export const connection = pgTable(
  "connection",
  {
    id: uuid(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    platform: text("platform").$type<PlatformId>().notNull(),
    /** The platform's own id for the account (channel id, page id, …). */
    externalId: text("external_id").notNull(),
    accountName: text("account_name").notNull(),
    status: text("status").$type<ConnectionStatus>().notNull().default("connected"),
    scopes: text("scopes"),
    /** AES-256-GCM encrypted; never store platform tokens in plain text. */
    accessTokenEnc: text("access_token_enc"),
    refreshTokenEnc: text("refresh_token_enc"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    /** Why the last sync attempt failed (cleared on success); shown in Settings. */
    lastSyncError: text("last_sync_error"),
    lastSyncErrorAt: timestamp("last_sync_error_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("connection_user_platform_uq").on(t.userId, t.platform), index("connection_user_id_idx").on(t.userId)],
);

/**
 * One day of account numbers. Values are exactly what the platform reported for
 * that day; null means the platform did not report it (for example days before
 * a connection that only shares totals), never an estimate and never "zero".
 */
export const dailyStat = pgTable(
  "daily_stat",
  {
    id: uuid(),
    connectionId: text("connection_id")
      .notNull()
      .references(() => connection.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    followers: integer("followers"),
    followersGained: integer("followers_gained"),
    views: bigint("views", { mode: "number" }),
    engagements: integer("engagements"),
    posts: integer("posts").notNull().default(0),
    watchMinutes: bigint("watch_minutes", { mode: "number" }),
  },
  (t) => [unique("daily_stat_connection_date_uq").on(t.connectionId, t.date)],
);

export const post = pgTable(
  "post",
  {
    id: uuid(),
    connectionId: text("connection_id")
      .notNull()
      .references(() => connection.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    kind: text("kind").$type<PostKind>().notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    thumbnailUrl: text("thumbnail_url"),
    permalink: text("permalink"),
    createdAt: createdAt(),
  },
  (t) => [unique("post_connection_external_uq").on(t.connectionId, t.externalId), index("post_published_idx").on(t.publishedAt)],
);

/** Lifetime totals for a post as of `date`. */
export const postStat = pgTable(
  "post_stat",
  {
    id: uuid(),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    views: bigint("views", { mode: "number" }).notNull().default(0),
    likes: integer("likes").notNull().default(0),
    comments: integer("comments").notNull().default(0),
    shares: integer("shares").notNull().default(0),
    avgWatchSeconds: real("avg_watch_seconds"),
  },
  (t) => [unique("post_stat_post_date_uq").on(t.postId, t.date)],
);

/** Audience breakdowns, e.g. dimension "age" key "25-34" share 38.2. */
export const audienceStat = pgTable(
  "audience_stat",
  {
    id: uuid(),
    connectionId: text("connection_id")
      .notNull()
      .references(() => connection.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    dimension: text("dimension").$type<"age" | "country" | "gender">().notNull(),
    key: text("key").notNull(),
    share: real("share").notNull(),
  },
  (t) => [unique("audience_stat_uq").on(t.connectionId, t.date, t.dimension, t.key)],
);

/* ---------------- preferences ---------------- */

export const alertSetting = pgTable(
  "alert_setting",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"spike" | "milestone" | "drop" | "reconnect">().notNull(),
    enabled: boolean("enabled").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.kind] })],
);

export const reportSchedule = pgTable("report_schedule", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(true),
  /** 1 = Monday … 7 = Sunday */
  dayOfWeek: integer("day_of_week").notNull().default(1),
  hour: integer("hour").notNull().default(9),
  timezone: text("timezone").notNull().default("UTC"),
  /** When the last weekly email went out, so each week sends once. */
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
});

/**
 * Alerts already sent, one per user, kind and key (a post id, a milestone, a week).
 * Also the in-app notification inbox: what was said, where it leads, and when it was read.
 */
export const alertEvent = pgTable(
  "alert_event",
  {
    id: uuid(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"spike" | "milestone" | "drop" | "reconnect" | "report">().notNull(),
    key: text("key").notNull(),
    /** Empty on alerts sent before the inbox existed; those stay out of it. */
    title: text("title").notNull().default(""),
    body: text("body").notNull().default(""),
    url: text("url").notNull().default(""),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [unique("alert_event_uq").on(t.userId, t.kind, t.key), index("alert_event_user_created_idx").on(t.userId, t.createdAt)],
);

/** Web push subscriptions, one per browser or device. */
export const pushSubscription = pgTable(
  "push_subscription",
  {
    id: uuid(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("push_subscription_user_id_idx").on(t.userId)],
);

/* ---------------- operations ---------------- */

/** Fixed-window counters. Used by Better Auth (database storage) and the app's own limits (keys "app:…"). */
export const rateLimit = pgTable("rate_limit", {
  id: uuid(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  /** Milliseconds since epoch. */
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/** One row per background job run, for monitoring and the health check. */
export const jobRun = pgTable(
  "job_run",
  {
    id: uuid(),
    name: text("name").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    ok: boolean("ok"),
    /** JSON summary of what the run did (counts only, no personal data). */
    summary: text("summary"),
  },
  (t) => [index("job_run_name_started_idx").on(t.name, t.startedAt)],
);

/** A lease so two runs of the same job never overlap. */
export const jobLease = pgTable("job_lease", {
  name: text("name").primaryKey(),
  holder: text("holder").notNull(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }).notNull(),
});

/** The person's uploaded profile photo, kept apart from the auth tables so storage can move later. */
export const userAvatar = pgTable("user_avatar", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  mime: text("mime").notNull(),
  /** Base64 image bytes (256×256, at most 200 KB before encoding). */
  data: text("data").notNull(),
  updatedAt: updatedAt(),
});

/**
 * When the person agreed to the Terms of Service and Privacy Policy, and to which
 * version (TERMS_VERSION). Kept apart from the auth tables; a newer version asks again.
 */
export const termsAcceptance = pgTable("terms_acceptance", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  version: text("version").notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
});
