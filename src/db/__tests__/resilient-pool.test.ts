import { Pool, type PoolClient } from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";

const kept: Promise<unknown>[] = [];
vi.mock("@vercel/functions", () => ({ waitUntil: (p: Promise<unknown>) => void kept.push(p) }));

const { ResilientPool } = await import("@/db/resilient-pool");

const fakeClient = () => {
  const release = vi.fn();
  return { client: { release } as unknown as PoolClient, release };
};
const settled = async (p: Promise<unknown>) => {
  let done = false;
  void p.then(() => (done = true));
  await new Promise((r) => setTimeout(r, 0));
  return done;
};

afterEach(() => {
  vi.restoreAllMocks();
  kept.length = 0;
});

describe("ResilientPool", () => {
  it("tries a connection once more when opening it failed, e.g. a timer left over from a frozen instance", async () => {
    const { client } = fakeClient();
    const connect = vi
      .spyOn(Pool.prototype, "connect")
      .mockRejectedValueOnce(new Error("Connection terminated due to connection timeout"))
      .mockResolvedValueOnce(client as never);
    const pool = new ResilientPool();
    await expect(pool.connect()).resolves.toBe(client);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it("gives up after the second failure", async () => {
    vi.spyOn(Pool.prototype, "connect").mockRejectedValue(new Error("timeout exceeded when trying to connect"));
    await expect(new ResilientPool().connect()).rejects.toThrow("timeout exceeded");
    expect(await settled(kept[0])).toBe(true);
  });

  it("does not retry errors that another try would not fix", async () => {
    const connect = vi.spyOn(Pool.prototype, "connect").mockRejectedValue(new Error('password authentication failed for user "x"'));
    await expect(new ResilientPool().connect()).rejects.toThrow("password");
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("keeps the instance awake from asking for a connection until it is handed back", async () => {
    const { client, release } = fakeClient();
    vi.spyOn(Pool.prototype, "connect").mockResolvedValue(client as never);
    const got = await new ResilientPool().connect();
    expect(kept).toHaveLength(1);
    expect(await settled(kept[0])).toBe(false);
    got.release();
    expect(release).toHaveBeenCalledOnce();
    expect(await settled(kept[0])).toBe(true);
  });

  it("serves callback-style callers, which pool.query uses", async () => {
    const { client } = fakeClient();
    vi.spyOn(Pool.prototype, "connect").mockResolvedValue(client as never);
    const got = await new Promise((resolve, reject) => new ResilientPool().connect((err, c) => (err ? reject(err) : resolve(c))));
    expect(got).toBe(client);
  });
});
