// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// Regression pin for the session-hijack bug found 2026-09-11.
//
// /demo signs a visitor in as the read-only demo identity. That is a WRITE to
// the browser's cookie jar, and it used to happen on any GET — including the
// RSC prefetch Next fires for the `<Link href="/demo">` on /login. A signed-in
// operator whose browser prefetched that link had their real session silently
// replaced by the demo one: the page they were looking at still showed their
// own tenant (client router cache), while the very next server request was the
// demo user. The visible symptoms were a 500 from the "Not spam" Server Action
// (demo_readonly holds SELECT and nothing else, so its activity_logs INSERT is
// denied) and the account "switching to demo" on the next refresh.
//
// Two guards, pinned below. Either alone is insufficient: the header guard
// stops the prefetcher, the session guard stops everything else that reaches
// the route with a real session already in hand.

type RouteGet = (request: Request) => Promise<Response>;

async function loadRoute(options: { signedIn?: boolean } = {}) {
  const signInWithPassword = vi.fn(async () => ({ error: null }));
  const getClaims = vi.fn(async () => ({
    data: options.signedIn ? { claims: { sub: "real-operator-id" } } : null,
  }));

  vi.doMock("@/lib/supabase/server", () => ({
    createClient: vi.fn(async () => ({ auth: { signInWithPassword, getClaims } })),
  }));

  const { GET } = (await import("./route")) as { GET: RouteGet };
  return { GET, signInWithPassword, getClaims };
}

describe("GET /demo", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/supabase/server");
    process.env.DEMO_VISITOR_EMAIL = "demo.visitor@example.com";
    process.env.DEMO_VISITOR_PASSWORD = "demo-visitor-password";
    process.env.NEXT_PUBLIC_APP_URL = "https://crm.example.com";
  });

  it("signs in the demo identity on a real navigation", async () => {
    const { GET, signInWithPassword } = await loadRoute();

    const response = await GET(new Request("https://crm.example.com/demo"));

    expect(signInWithPassword).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(307);
  });

  it("does not sign in on a router prefetch", async () => {
    const { GET, signInWithPassword } = await loadRoute();

    const response = await GET(
      new Request("https://crm.example.com/demo", {
        headers: { RSC: "1", "Next-Router-Prefetch": "1" },
      }),
    );

    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(response.status).toBe(204);
  });

  it("does not sign in on any RSC request, prefetch header or not", async () => {
    const { GET, signInWithPassword } = await loadRoute();

    await GET(new Request("https://crm.example.com/demo", { headers: { RSC: "1" } }));

    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("never replaces a session that already exists", async () => {
    const { GET, signInWithPassword } = await loadRoute({ signedIn: true });

    const response = await GET(new Request("https://crm.example.com/demo"));

    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://crm.example.com/");
  });
});
