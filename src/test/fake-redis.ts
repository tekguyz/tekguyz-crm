/**
 * An in-memory stand-in for the slice of `@upstash/redis` the webhook replay
 * guard and rate limiter use — `set` with NX/EX, and a pipeline of
 * `zremrangebyscore` / `zcard` / `zadd` / `pexpire`. Nothing else is modelled,
 * so a new command in either module fails loudly here instead of passing
 * against a mock that silently returns undefined.
 *
 * Expiry reads `Date.now()`, so a test can move time with
 * `vi.useFakeTimers({ toFake: ["Date"] })` + `vi.setSystemTime`.
 */

type StringEntry = { value: unknown; expiresAt: number | null };

type FakeRedisOptions = {
  /** `set` rejects, the way the replay guard sees a dead endpoint. */
  failSet?: boolean;
  /** Every pipeline `exec` rejects, the way the rate limiter sees one. */
  failPipeline?: boolean;
};

/** What a dead Upstash endpoint looks like under this project's 1s AbortSignal. */
const timeoutError = () =>
  new DOMException("The operation was aborted due to timeout", "TimeoutError");

export function createFakeRedis({ failSet = false, failPipeline = false }: FakeRedisOptions = {}) {
  const strings = new Map<string, StringEntry>();
  const zsets = new Map<string, Map<string, number>>();
  const pexpires: Array<{ key: string; ms: number }> = [];

  const liveString = (key: string): StringEntry | undefined => {
    const entry = strings.get(key);
    if (entry && entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      strings.delete(key);
      return undefined;
    }
    return entry;
  };

  const zset = (key: string): Map<string, number> => {
    let set = zsets.get(key);
    if (!set) {
      set = new Map();
      zsets.set(key, set);
    }
    return set;
  };

  function pipeline() {
    const queued: Array<() => unknown> = [];
    const builder = {
      zremrangebyscore(key: string, min: number, max: number) {
        queued.push(() => {
          const set = zset(key);
          let removed = 0;
          for (const [member, score] of set) {
            if (score >= min && score <= max) {
              set.delete(member);
              removed++;
            }
          }
          return removed;
        });
        return builder;
      },
      zcard(key: string) {
        queued.push(() => zset(key).size);
        return builder;
      },
      zadd(key: string, entry: { score: number; member: string }) {
        queued.push(() => {
          const set = zset(key);
          const added = set.has(entry.member) ? 0 : 1;
          set.set(entry.member, entry.score);
          return added;
        });
        return builder;
      },
      // Recorded, not enforced: expiry of the sorted set itself is Redis
      // housekeeping, and the window logic never depends on it.
      pexpire(key: string, ms: number) {
        queued.push(() => {
          pexpires.push({ key, ms });
          return 1;
        });
        return builder;
      },
      async exec<T = unknown[]>(): Promise<T> {
        if (failPipeline) throw timeoutError();
        return queued.map((run) => run()) as T;
      },
    };
    return builder;
  }

  return {
    strings,
    zsets,
    pexpires,
    async set(key: string, value: unknown, opts?: { nx?: boolean; ex?: number }) {
      if (failSet) throw timeoutError();
      if (opts?.nx && liveString(key)) return null;
      strings.set(key, {
        value,
        expiresAt: opts?.ex ? Date.now() + opts.ex * 1000 : null,
      });
      return "OK" as const;
    },
    pipeline,
  };
}

export type FakeRedis = ReturnType<typeof createFakeRedis>;
