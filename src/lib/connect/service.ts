/**
 * The only code that reads or writes platform tokens. Tokens are encrypted
 * before they reach the database and decrypted only to call a platform.
 * Every function takes the database so tests can pass an in-memory one.
 */
import { and, eq, isNotNull, lt } from "drizzle-orm";
import type { Db } from "@/db";
import { connection } from "@/db/schema";
import { PLATFORM_ORDER, type ConnectionView, type PlatformId } from "@/lib/data/types";
import { PLATFORM_NAMES } from "@/lib/platforms";
import { decrypt, encrypt } from "./crypto";
import { connectMode, ReauthRequired, resolveProvider, type TokenSet } from "./providers";

type ConnectionRow = typeof connection.$inferSelect;

/** Stores (or replaces) the user's connection for a platform, encrypting its tokens. */
export async function saveConnection(db: Db, userId: string, platform: PlatformId, tokens: TokenSet, account: { externalId: string; name: string }) {
  const [existing] = await db.select().from(connection).where(and(eq(connection.userId, userId), eq(connection.platform, platform)));
  // a different account on the same platform starts a fresh history
  if (existing && existing.externalId !== account.externalId) await db.delete(connection).where(eq(connection.id, existing.id));

  const values = {
    externalId: account.externalId,
    accountName: account.name,
    status: "connected" as const,
    scopes: tokens.scopes,
    accessTokenEnc: encrypt(tokens.accessToken),
    refreshTokenEnc: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
    tokenExpiresAt: tokens.expiresAt,
    // a reconnect clears the reason the old connection stopped
    lastSyncError: null,
    lastSyncErrorAt: null,
  };
  const [row] = await db
    .insert(connection)
    .values({ userId, platform, ...values })
    .onConflictDoUpdate({ target: [connection.userId, connection.platform], set: values })
    .returning({ id: connection.id });
  return row.id;
}

/** Every platform in display order, with the user's status for each. */
export async function listConnections(db: Db, userId: string): Promise<ConnectionView[]> {
  const rows = await db.select().from(connection).where(eq(connection.userId, userId));
  const byPlatform = new Map(rows.map((r) => [r.platform, r]));
  return PLATFORM_ORDER.map((id) => {
    const row = byPlatform.get(id);
    return {
      id,
      name: PLATFORM_NAMES[id],
      account: row?.accountName ?? "",
      status: row?.status ?? "not-connected",
      mode: connectMode(id),
      updatedAt: row?.lastSyncedAt?.toISOString() ?? null,
      syncError: row?.lastSyncError ?? null,
    };
  });
}

async function markExpired(db: Db, id: string) {
  await db.update(connection).set({ status: "expired" }).where(eq(connection.id, id));
}

/**
 * A working access token for a connection, refreshed first when it is about to
 * expire. Throws ReauthRequired (and marks the connection expired) when the
 * platform will not issue a new one.
 */
export async function getAccessToken(db: Db, connectionId: string, now = new Date()): Promise<string> {
  const [row] = await db.select().from(connection).where(eq(connection.id, connectionId));
  if (!row || row.status !== "connected" || !row.accessTokenEnc) throw new ReauthRequired("Not connected");
  const resolved = resolveProvider(row.platform);
  if (!resolved) throw new Error(`${PLATFORM_NAMES[row.platform]} is not configured on this server`);
  const { provider } = resolved;

  const expiresAt = row.tokenExpiresAt?.getTime();
  const due = expiresAt !== undefined && expiresAt - now.getTime() <= provider.refreshWindowSeconds * 1000;
  if (!due) return decrypt(row.accessTokenEnc);

  if (!provider.refresh) {
    if (expiresAt! > now.getTime()) return decrypt(row.accessTokenEnc);
    await markExpired(db, row.id);
    throw new ReauthRequired();
  }
  try {
    const fresh = await provider.refresh({ accessToken: decrypt(row.accessTokenEnc), refreshToken: row.refreshTokenEnc ? decrypt(row.refreshTokenEnc) : null });
    await db
      .update(connection)
      .set({
        accessTokenEnc: encrypt(fresh.accessToken),
        refreshTokenEnc: fresh.refreshToken ? encrypt(fresh.refreshToken) : row.refreshTokenEnc,
        tokenExpiresAt: fresh.expiresAt,
        ...(fresh.scopes ? { scopes: fresh.scopes } : {}),
      })
      .where(eq(connection.id, row.id));
    return fresh.accessToken;
  } catch (e) {
    if (e instanceof ReauthRequired) await markExpired(db, row.id);
    // a temporary failure leaves a still-valid token usable
    else if (expiresAt! > now.getTime()) return decrypt(row.accessTokenEnc);
    throw e;
  }
}

/** Revokes access at the platform when it supports that (best effort), then deletes the connection and its stats. */
export async function disconnect(db: Db, userId: string, platform: PlatformId): Promise<boolean> {
  const [row] = await db.select().from(connection).where(and(eq(connection.userId, userId), eq(connection.platform, platform)));
  if (!row) return false;
  await revokeQuietly(row);
  await db.delete(connection).where(eq(connection.id, row.id));
  return true;
}

async function revokeQuietly(row: ConnectionRow) {
  const provider = resolveProvider(row.platform)?.provider;
  if (!provider?.revoke || !row.accessTokenEnc) return;
  try {
    await provider.revoke({ accessToken: decrypt(row.accessTokenEnc), refreshToken: row.refreshTokenEnc ? decrypt(row.refreshTokenEnc) : null });
  } catch {
    // the person can still remove access from the platform's own settings
  }
}

/** Longest refresh window of any provider (Instagram's 10 days). */
const LOOKAHEAD_MS = 10 * 24 * 60 * 60 * 1000;

/** Daily job: refresh tokens that expire soon; mark the ones that cannot be refreshed as expired. */
export async function refreshExpiring(db: Db, now = new Date()) {
  const rows = await db
    .select({ id: connection.id })
    .from(connection)
    .where(and(eq(connection.status, "connected"), isNotNull(connection.tokenExpiresAt), lt(connection.tokenExpiresAt, new Date(now.getTime() + LOOKAHEAD_MS))));
  const result = { checked: rows.length, expired: 0, failed: 0 };
  for (const { id } of rows) {
    try {
      await getAccessToken(db, id, now);
    } catch (e) {
      if (e instanceof ReauthRequired) result.expired++;
      else result.failed++;
    }
  }
  return result;
}
