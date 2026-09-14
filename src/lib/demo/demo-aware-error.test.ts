import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEMO_READ_ONLY_DIGEST, isDemoReadOnlyRefusal } from "@/lib/demo/read-only-refusal";

// The scoping rule under test: a refusal is re-labelled as "the demo is
// read-only" only when BOTH hold — Postgres said 42501 AND the tenant is the
// demo. 42501 alone is not enough, because real tenants raise it too (the
// leads role trigger, the team-management RPCs, a plain RLS WITH CHECK
// denial). A demo tenant alone is not enough either, because a real bug in the
// demo must still show the real error boundary.
const getCurrentOrg = vi.fn();

async function load() {
  vi.doMock("server-only", () => ({}));
  vi.doMock("@/lib/organizations/current", () => ({ getCurrentOrg }));
  vi.resetModules();
  return import("@/lib/demo/demo-aware-error");
}

const REFUSAL = { code: "42501", message: "permission denied for table tasks", details: null, hint: null };

describe("demoAwareError", () => {
  beforeEach(() => {
    getCurrentOrg.mockReset();
  });

  it("tags a 42501 in the demo tenant with the read-only digest", async () => {
    getCurrentOrg.mockResolvedValue({ isDemo: true });
    const { demoAwareError } = await load();

    const thrown = await demoAwareError(REFUSAL);

    expect(thrown).toBeInstanceOf(Error);
    expect(isDemoReadOnlyRefusal(thrown)).toBe(true);
    expect((thrown as Error & { digest?: string }).digest).toBe(DEMO_READ_ONLY_DIGEST);
    // The server log still carries what Postgres actually said.
    expect((thrown as Error).message).toContain("permission denied for table tasks");
  });

  it("leaves a 42501 in a real tenant exactly as it was", async () => {
    getCurrentOrg.mockResolvedValue({ isDemo: false });
    const { demoAwareError } = await load();

    const thrown = await demoAwareError(REFUSAL);

    expect(thrown).toBe(REFUSAL);
    expect(isDemoReadOnlyRefusal(thrown)).toBe(false);
  });

  it("leaves any other error in the demo tenant exactly as it was", async () => {
    getCurrentOrg.mockResolvedValue({ isDemo: true });
    const { demoAwareError } = await load();
    const other = { code: "23514", message: "check violation", details: null, hint: null };

    const thrown = await demoAwareError(other);

    expect(thrown).toBe(other);
    expect(isDemoReadOnlyRefusal(thrown)).toBe(false);
    // Not a 42501, so the tenant is never even looked up.
    expect(getCurrentOrg).not.toHaveBeenCalled();
  });
});

describe("isDemoReadOnlyRefusal", () => {
  it("is false for an ordinary production error digest", () => {
    expect(isDemoReadOnlyRefusal(Object.assign(new Error("x"), { digest: "1234567890" }))).toBe(false);
  });

  it("is false for things that are not errors", () => {
    expect(isDemoReadOnlyRefusal(null)).toBe(false);
    expect(isDemoReadOnlyRefusal("42501")).toBe(false);
  });
});
