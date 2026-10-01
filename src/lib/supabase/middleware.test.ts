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

  it("shows a signed-out visitor the Landing Page at / — a rewrite, not a redirect", async () => {
    const res = await updateSession(new NextRequest("http://localhost/"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-rewrite")).toBe("http://localhost/welcome");
  });

  it("shows a signed-in user the app at /", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-1" } } });
    const res = await updateSession(new NextRequest("http://localhost/"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("sends a direct /welcome to / so the Landing Page has one address", async () => {
    const res = await updateSession(new NextRequest("http://localhost/welcome"));
    expect(res.headers.get("location")).toBe("http://localhost/");
  });
});
