/**
 * A node-postgres pool for Vercel functions.
 *
 * Vercel freezes an instance once its requests have finished. attachDatabasePool
 * keeps it awake after a connection is handed back (so idle ones close cleanly),
 * but not while one is still being opened: a request that ends mid-connect (a
 * cancelled prefetch, a visitor navigating away) froze the half-open connection,
 * and on the next wake its 10-second timer fired at once, failing that request
 * with "Connection terminated due to connection timeout".
 *
 * So this pool keeps the instance awake from asking for a connection until it
 * is handed back, and tries once more when opening a connection fails in a way
 * another try can fix. Only opening is retried: no query has been sent yet.
 */
import { waitUntil } from "@vercel/functions";
import { Pool, type PoolClient } from "pg";

/** Failures while opening a connection that a fresh attempt can fix. */
const TRANSIENT = /connection timeout|timeout exceeded when trying to connect|Connection terminated unexpectedly|ECONNRESET|ETIMEDOUT|EPIPE/i;

type Callback = (err: Error | undefined, client: PoolClient | undefined, done: (release?: unknown) => void) => void;

export class ResilientPool extends Pool {
  override connect(): Promise<PoolClient>;
  override connect(callback: Callback): void;
  override connect(callback?: Callback): Promise<PoolClient> | void {
    const checkout = this.checkout();
    if (!callback) return checkout;
    checkout.then(
      (client) => callback(undefined, client, (err) => client.release(err as Error | boolean | undefined)),
      (err: Error) => callback(err, undefined, () => {}),
    );
  }

  private async checkout(): Promise<PoolClient> {
    let handedBack!: () => void;
    waitUntil(new Promise<void>((resolve) => (handedBack = resolve)));
    try {
      const client = await this.open();
      // pg-pool gives the client a fresh release() on every checkout
      const release = client.release;
      client.release = (err?: Error | boolean) => {
        handedBack();
        return release.call(client, err);
      };
      return client;
    } catch (e) {
      handedBack();
      throw e;
    }
  }

  private async open(): Promise<PoolClient> {
    try {
      return await super.connect();
    } catch (e) {
      if (!(e instanceof Error && TRANSIENT.test(e.message))) throw e;
      return super.connect();
    }
  }
}
