import { describe, expect, it } from "vitest";
import { evaluateInvitePreview, type InvitePreview } from "./signup-gate";

const NOW = new Date("2026-09-05T12:00:00Z");

function preview(overrides: Partial<InvitePreview> = {}): InvitePreview {
  return {
    organization_name: "TEKGUYZ",
    email: "Invitee@Example.com",
    role: "MEMBER",
    status: "PENDING",
    expires_at: "2026-09-12T12:00:00Z",
    ...overrides,
  };
}

describe("evaluateInvitePreview", () => {
  it("admits a live PENDING invite and lowercases its email", () => {
    const gate = evaluateInvitePreview(preview(), NOW);
    expect(gate).toEqual({
      ok: true,
      email: "invitee@example.com",
      organizationName: "TEKGUYZ",
      role: "MEMBER",
    });
  });

  it("refuses a missing invite", () => {
    expect(evaluateInvitePreview(null, NOW).ok).toBe(false);
  });

  it.each(["ACCEPTED", "REVOKED"])("refuses a %s invite", (status) => {
    expect(evaluateInvitePreview(preview({ status }), NOW).ok).toBe(false);
  });

  it("refuses an expired invite", () => {
    const gate = evaluateInvitePreview(
      preview({ expires_at: "2026-09-04T12:00:00Z" }),
      NOW,
    );
    expect(gate.ok).toBe(false);
  });

  it("gives every refusal the same wording, so a guesser learns nothing", () => {
    const reasons = [
      evaluateInvitePreview(null, NOW),
      evaluateInvitePreview(preview({ status: "REVOKED" }), NOW),
      evaluateInvitePreview(preview({ expires_at: "2020-01-01T00:00:00Z" }), NOW),
    ].map((g) => (g.ok ? "" : g.reason));

    expect(new Set(reasons).size).toBe(1);
  });
});
