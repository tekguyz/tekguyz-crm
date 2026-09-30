// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeRedis, type FakeRedis } from "@/test/fake-redis";

// The "start demo" Server Action — the only door into the demo (#31).
//
// It runs on POST only, as a Server Action, so no link preview, prefetch or
// crawler can reach it. These tests drive it the way a button press does and
// check what the database and the browser would see: whether a user and a
// Demo Org were made, and whether the browser was signed in.

const T = Date.UTC(2026, 8, 30, 12, 0, 0);
const REDIRECTED = "NEXT_REDIRECT";

type Options = {
  signedIn?: boolean;
  ip?: string;
  redis?: FakeRedis | (() => never);
  createOrgError?: { message: string } | null;
};

async function load(options: Options = {}) {
  const createUser = vi.fn(async ({ email }: { email: string }) => ({
    data: { user: { id: "guest-user-id", email } },
    error: null,
  }));
  const deleteUser = vi.fn(async () => ({ error: null }));
  const rpc = vi.fn(async () => ({ data: "demo-org-id", error: options.createOrgError ?? null }));
  const signInWithPassword = vi.fn(async () => ({ error: null }));
  const signOut = vi.fn(async () => ({ error: null }));
  const getClaims = vi.fn(async () => ({
    data: options.signedIn ? { claims: { sub: "real-user-id" } } : null,
  }));
  const redirect = vi.fn((to: string) => {
    throw Object.assign(new Error(REDIRECTED), { to });
  });

  vi.resetModules();
  vi.doMock("server-only", () => ({}));
  vi.doMock("next/navigation", () => ({ redirect }));
  vi.doMock("next/headers", () => ({
    headers: async () => new Headers({ "x-forwarded-for": `${options.ip ?? "203.0.113.7"}, 10.0.0.1` }),
  }));
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: async () => ({ auth: { getClaims, signInWithPassword, signOut } }),
  }));
  vi.doMock("@/lib/supabase/admin", () => ({
    createAdminClient: () => ({ auth: { admin: { createUser, deleteUser } }, rpc }),
  }));
  const redis = options.redis;
  vi.doMock("@/lib/redis/client", () => ({
    getWebhookRedis: typeof redis === "function" ? redis : () => redis ?? createFakeRedis(),
  }));

  const { startDemo, leaveDemo } = await import("./start-demo");
  const press = async () => {
    try {
      return { result: await startDemo(null, new FormData()), redirectedTo: null };
    } catch (error) {
      if (error instanceof Error && error.message === REDIRECTED) {
        return { result: null, redirectedTo: (error as Error & { to: string }).to };
      }
      throw error;
    }
  };

  const leave = () =>
    leaveDemo().catch((error: Error & { to?: string }) => {
      if (error.message !== REDIRECTED) throw error;
      return error.to;
    });

  return { press, leave, createUser, deleteUser, rpc, signInWithPassword, signOut };
}

describe("startDemo", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("makes one Guest and one Demo Org, signs the Guest in, and goes home", async () => {
    const { press, createUser, rpc, signInWithPassword } = await load();

    const { redirectedTo } = await press();

    expect(createUser).toHaveBeenCalledTimes(1);
    const { email, password, email_confirm } = createUser.mock.calls[0][0] as {
      email: string;
      password: string;
      email_confirm: boolean;
    };
    expect(email).toMatch(/^demo-[a-z0-9]+@tekguyz-crm\.test$/);
    expect(email_confirm).toBe(true);

    expect(rpc).toHaveBeenCalledTimes(1);
    const [fn, args] = rpc.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(fn).toBe("create_demo_org");
    expect(args.p_user_id).toBe("guest-user-id");
    expect((args.p_sample as { leads: unknown[] }).leads).toHaveLength(20);

    expect(signInWithPassword).toHaveBeenCalledWith({ email, password });
    expect(redirectedTo).toBe("/");
  });

  it("makes a different Guest on every press", async () => {
    const first = await load();
    await first.press();
    const second = await load();
    await second.press();

    const emailOf = (mock: typeof first.createUser) => (mock.mock.calls[0][0] as { email: string }).email;
    expect(emailOf(first.createUser)).not.toBe(emailOf(second.createUser));
  });

  it("never replaces a session that already exists, and creates nothing", async () => {
    const { press, createUser, rpc, signInWithPassword } = await load({ signedIn: true });

    const { redirectedTo } = await press();

    expect(redirectedTo).toBe("/");
    expect(createUser).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("allows 5 Demo Orgs an hour from one IP, and refuses the 6th with nothing created", async () => {
    const redis = createFakeRedis();
    for (let i = 0; i < 5; i++) {
      expect((await (await load({ redis })).press()).redirectedTo).toBe("/");
    }

    const sixth = await load({ redis });
    const { result } = await sixth.press();

    expect(result).toEqual({ error: "The demo is busy. Try again in a few minutes." });
    expect(sixth.createUser).not.toHaveBeenCalled();
    expect(sixth.rpc).not.toHaveBeenCalled();
    expect(sixth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("lets that IP back in once the hour has passed", async () => {
    const redis = createFakeRedis();
    for (let i = 0; i < 5; i++) await (await load({ redis })).press();

    vi.setSystemTime(T + 60 * 60 * 1000 + 1);
    expect((await (await load({ redis })).press()).redirectedTo).toBe("/");
  });

  it("allows 50 Demo Orgs an hour in total, and refuses the 51st with nothing created", async () => {
    const redis = createFakeRedis();
    for (let i = 0; i < 50; i++) {
      expect((await (await load({ redis, ip: `198.51.100.${i}` })).press()).redirectedTo).toBe("/");
    }

    const next = await load({ redis, ip: "192.0.2.99" });
    const { result } = await next.press();

    expect(result).toEqual({ error: "The demo is busy. Try again in a few minutes." });
    expect(next.createUser).not.toHaveBeenCalled();
    expect(next.rpc).not.toHaveBeenCalled();
  });

  it("creates nothing when the cap store cannot be reached", async () => {
    const { press, createUser } = await load({
      redis: () => {
        throw new Error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set");
      },
    });

    const { result } = await press();

    expect(result).toEqual({ error: "The demo is busy. Try again in a few minutes." });
    expect(createUser).not.toHaveBeenCalled();
  });

  it("removes the Guest and signs nobody in when the Demo Org cannot be made", async () => {
    const { press, deleteUser, signInWithPassword } = await load({
      createOrgError: { message: "boom" },
    });

    const { result } = await press();

    expect(result).toEqual({ error: "The demo could not start. Try again in a few minutes." });
    expect(deleteUser).toHaveBeenCalledWith("guest-user-id");
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});

describe("leaveDemo", () => {
  it("signs the Guest out and returns to the Landing Page", async () => {
    const { leave, signOut } = await load({ signedIn: true });

    expect(await leave()).toBe("/");
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
