import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The action, not the page, is the boundary.
 *
 * A Server Action is POST-able directly, so hiding the form proves nothing.
 * These tests drive `signUp` with the page bypassed entirely and assert that
 * `supabase.auth.signUp` — the only call that can create an account — is never
 * reached without a live invite naming the submitted address.
 */

type RpcResult = { data: unknown; error: unknown };

function mockEnv(rpc: RpcResult) {
  const authSignUp = vi.fn((_args: { email: string; password: string }) =>
    Promise.resolve({ data: { session: {} }, error: null }),
  );
  const redirects: string[] = [];

  const client = {
    rpc: vi.fn(() => ({ maybeSingle: () => Promise.resolve(rpc) })),
    auth: { signUp: authSignUp },
  };

  vi.doMock("@/lib/supabase/server", () => ({
    createClient: () => Promise.resolve(client),
  }));
  vi.doMock("next/navigation", () => ({
    redirect: (url: string) => {
      redirects.push(url);
      throw new Error(`REDIRECT:${url}`);
    },
  }));

  return { authSignUp, redirects };
}

async function loadSignUp() {
  vi.resetModules();
  return (await import("@/lib/auth/actions")).signUp;
}

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.append(k, v);
  return data;
}

const LIVE_INVITE = {
  organization_name: "TEKGUYZ",
  email: "invitee@example.com",
  role: "MEMBER",
  status: "PENDING",
  expires_at: "2099-01-01T00:00:00Z",
};

async function run(signUp: (f: FormData) => Promise<void>, fields: Record<string, string>) {
  await expect(signUp(form(fields))).rejects.toThrow(/REDIRECT:/);
}

describe("signUp is invite-gated", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/supabase/server");
    vi.doUnmock("next/navigation");
  });

  it("refuses with no token at all", async () => {
    const env = mockEnv({ data: null, error: null });
    await run(await loadSignUp(), { email: "stranger@example.com", password: "hunter22" });
    expect(env.authSignUp).not.toHaveBeenCalled();
    expect(env.redirects[0]).toContain("/login?error=");
  });

  it("refuses a token that names no invite", async () => {
    const env = mockEnv({ data: null, error: null });
    await run(await loadSignUp(), {
      token: "00000000-0000-0000-0000-000000000000",
      email: "stranger@example.com",
      password: "hunter22",
    });
    expect(env.authSignUp).not.toHaveBeenCalled();
  });

  it("refuses a revoked invite", async () => {
    const env = mockEnv({ data: { ...LIVE_INVITE, status: "REVOKED" }, error: null });
    await run(await loadSignUp(), {
      token: "tok",
      email: "invitee@example.com",
      password: "hunter22",
    });
    expect(env.authSignUp).not.toHaveBeenCalled();
  });

  it("refuses an expired invite", async () => {
    const env = mockEnv({
      data: { ...LIVE_INVITE, expires_at: "2020-01-01T00:00:00Z" },
      error: null,
    });
    await run(await loadSignUp(), {
      token: "tok",
      email: "invitee@example.com",
      password: "hunter22",
    });
    expect(env.authSignUp).not.toHaveBeenCalled();
  });

  it("refuses a live token used with a different email", async () => {
    const env = mockEnv({ data: LIVE_INVITE, error: null });
    await run(await loadSignUp(), {
      token: "tok",
      email: "attacker@example.com",
      password: "hunter22",
    });
    expect(env.authSignUp).not.toHaveBeenCalled();
    expect(env.redirects[0]).toContain("different%20email");
  });

  it("creates the account for a live invite and the invited address", async () => {
    const env = mockEnv({ data: LIVE_INVITE, error: null });
    await run(await loadSignUp(), {
      token: "tok",
      email: "Invitee@Example.com",
      password: "hunter22",
    });
    expect(env.authSignUp).toHaveBeenCalledTimes(1);
    expect(env.authSignUp.mock.calls[0]?.[0]).toMatchObject({
      email: "invitee@example.com",
      password: "hunter22",
    });
    expect(env.redirects[0]).toBe("/invite/tok");
  });
});
