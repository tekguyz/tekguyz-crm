import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth: { getClaims } })),
}));

import { updateSession } from "./middleware";

describe("updateSession", () => {
  beforeEach(() => {
    getClaims.mockReset();
    getClaims.mockResolvedValue({ data: { claims: null } });
  });

  it("GET /demo never calls Supabase auth and is not redirected", async () => {
    const res = await updateSession(new NextRequest("http://localhost/demo"));
    expect(getClaims).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBeNull();
  });

  it("still sends a signed-out visitor from a page route to /login", async () => {
    const res = await updateSession(new NextRequest("http://localhost/pipeline"));
    expect(getClaims).toHaveBeenCalledOnce();
    expect(res.headers.get("location")).toBe("http://localhost/login");
  });
});
