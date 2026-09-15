import { beforeEach, describe, expect, it, vi } from "vitest";

// Drives the signIn Server Action directly, with Supabase and redirect()
// mocked at their boundaries. Same shape as signup-gate-action.test.ts.
function mockEnv(authError: { message: string } | null) {
  const redirects: string[] = [];

  vi.doMock("@/lib/supabase/server", () => ({
    createClient: () =>
      Promise.resolve({
        auth: { signInWithPassword: () => Promise.resolve({ error: authError }) },
      }),
  }));
  vi.doMock("next/navigation", () => ({
    redirect: (url: string) => {
      redirects.push(url);
      throw new Error(`REDIRECT:${url}`);
    },
  }));

  return redirects;
}

async function submit(fields: Record<string, string>) {
  vi.resetModules();
  const { signIn } = await import("@/lib/auth/actions");
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.append(k, v);
  await expect(signIn(data)).rejects.toThrow(/REDIRECT:/);
}

const CREDS = { email: "sam@tekguyz.com", password: "pw" };

describe("signIn — where it sends the user", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("lands on a same-origin next after a good sign-in", async () => {
    const redirects = mockEnv(null);
    await submit({ ...CREDS, next: "/reports?period=month" });
    expect(redirects).toEqual(["/reports?period=month"]);
  });

  it("never follows a next that leaves this origin", async () => {
    for (const hostile of ["https://evil.example", "//evil.example", "/\\evil.example"]) {
      const redirects = mockEnv(null);
      await submit({ ...CREDS, next: hostile });
      expect(redirects, hostile).toEqual(["/"]);
    }
  });

  it("keeps next through a wrong-password redirect", async () => {
    const redirects = mockEnv({ message: "Invalid login credentials" });
    await submit({ ...CREDS, next: "/reports" });

    const url = new URL(redirects[0], "http://x.invalid");
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("error")).toBe("Invalid login credentials");
    expect(url.searchParams.get("next")).toBe("/reports");
  });

  it("adds no next to the error redirect when there was none, or it was hostile", async () => {
    for (const next of [undefined, "https://evil.example"]) {
      const redirects = mockEnv({ message: "Invalid login credentials" });
      await submit(next ? { ...CREDS, next } : CREDS);
      const url = new URL(redirects[0], "http://x.invalid");
      expect(url.searchParams.get("error")).toBe("Invalid login credentials");
      expect(url.searchParams.has("next")).toBe(false);
    }
  });
});
