// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// GET /demo is a plain redirect to the Landing Page (#29, #31).
//
// It used to sign a visitor in, and on 2026-09-11 an RSC prefetch of it
// replaced a real operator's session with the demo one. The fix is not a
// better guard: no GET signs anyone in. So this route must never even reach
// Supabase auth — with or without a session, prefetch header or not. Supabase
// is mocked to throw, so any call at all fails the test.

type RouteGet = (request: Request) => Promise<Response> | Response;

async function loadRoute() {
  const touched = vi.fn(() => {
    throw new Error("GET /demo touched Supabase");
  });
  vi.resetModules();
  vi.doMock("@/lib/supabase/server", () => ({ createClient: touched }));
  const { GET } = (await import("./route")) as { GET: RouteGet };
  return { GET, touched };
}

const CASES: [string, HeadersInit][] = [
  ["a plain visit", {}],
  ["a visit with a session cookie", { cookie: "sb-project-auth-token=abc" }],
  ["an RSC prefetch", { RSC: "1", "Next-Router-Prefetch": "1" }],
];

describe("GET /demo", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://crm.example.com";
  });

  it.each(CASES)("redirects %s to the Landing Page without touching Supabase", async (_name, headers) => {
    const { GET, touched } = await loadRoute();

    const response = await GET(new Request("https://crm.example.com/demo", { headers }));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://crm.example.com/");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(touched).not.toHaveBeenCalled();
  });
});
