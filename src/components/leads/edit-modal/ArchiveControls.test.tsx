import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Lead } from "@/lib/leads/queries";
import { ArchiveControls } from "./ArchiveControls";

// The Server Actions are never invoked by these tests — they are mocked only so
// the "use server" module (and its next/cache import) never loads in jsdom.
vi.mock("@/lib/leads/archive-actions", () => ({
  archiveLead: vi.fn(),
  unarchiveLead: vi.fn(),
}));

const lead = {
  id: "00000000-0000-0000-0000-000000000001",
  client_name: "Ben Whitaker",
  email: "ben@example.com",
  archived: false,
} as unknown as Lead;

describe("ArchiveControls — role gating", () => {
  it.each(["OWNER", "ADMIN"])("renders the archive button for %s", (role) => {
    render(<ArchiveControls lead={lead} role={role} />);

    expect(screen.getByRole("button", { name: "Archive lead" })).toBeInTheDocument();
  });

  it("renders nothing for a MEMBER", () => {
    const { container } = render(<ArchiveControls lead={lead} role="MEMBER" />);

    expect(screen.queryByRole("button", { name: "Archive lead" })).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a MEMBER on an already-archived lead", () => {
    const { container } = render(
      <ArchiveControls lead={{ ...lead, archived: true }} role="MEMBER" />,
    );

    expect(screen.queryByRole("button", { name: "Unarchive lead" })).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});
