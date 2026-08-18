import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TeamMember } from "@/lib/invites/queries";
import { MemberRow } from "./MemberRow";

const changeMemberRole = vi.fn();
const removeMember = vi.fn();

// The "use server" module is mocked so it (and its next/cache import) never
// loads in jsdom. Unlike ArchiveControls.test.tsx these mocks ARE invoked —
// the point of the first test below is what the component does with a
// returned {error}.
vi.mock("@/lib/organizations/team-actions", () => ({
  changeMemberRole: (...args: unknown[]) => changeMemberRole(...args),
  removeMember: (...args: unknown[]) => removeMember(...args),
}));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const OWNER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const owner: TeamMember = {
  user_id: OWNER_ID,
  email: "owner@example.com",
  role: "OWNER",
};

function roleSelect(email: string) {
  return screen.getByLabelText(`Role for ${email}`) as HTMLSelectElement;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MemberRow — the role select must never show a change that was refused", () => {
  // Regression test. This shipped once as an uncontrolled <select defaultValue>,
  // which cannot be reset: defaultValue only applies at mount, so React
  // reconciles the same element on re-render and neither a server re-render nor
  // router.refresh() puts the old value back. Demoting the last owner — the
  // everyday refusal in a one-person org — left the panel reading "Member"
  // while the database still held OWNER. Found in the browser, not by a test;
  // this is the test.
  it("reverts to the stored role when the action returns an error", async () => {
    changeMemberRole.mockResolvedValue({ error: "This is the organization's only owner." });
    const user = userEvent.setup();

    render(<MemberRow member={owner} currentUserId={OWNER_ID} currentUserRole="OWNER" />);

    await user.selectOptions(roleSelect(owner.email), "MEMBER");

    expect(changeMemberRole).toHaveBeenCalledWith(OWNER_ID, "MEMBER");
    await waitFor(() => expect(roleSelect(owner.email).value).toBe("OWNER"));
  });

  it("keeps the new role when the action succeeds", async () => {
    changeMemberRole.mockResolvedValue(null);
    const user = userEvent.setup();

    render(<MemberRow member={owner} currentUserId={OWNER_ID} currentUserRole="OWNER" />);

    await user.selectOptions(roleSelect(owner.email), "ADMIN");

    await waitFor(() => expect(roleSelect(owner.email).value).toBe("ADMIN"));
  });
});

describe("MemberRow — which controls are offered", () => {
  it("offers a role select and Remove to an OWNER looking at somebody else", () => {
    render(
      <MemberRow
        member={{ user_id: OTHER_ID, email: "other@example.com", role: "MEMBER" }}
        currentUserId={OWNER_ID}
        currentUserRole="OWNER"
      />,
    );

    expect(screen.getByLabelText("Role for other@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("offers a MEMBER no role select and no Remove on somebody else's row", () => {
    render(
      <MemberRow
        member={{ user_id: OTHER_ID, email: "other@example.com", role: "ADMIN" }}
        currentUserId={OWNER_ID}
        currentUserRole="MEMBER"
      />,
    );

    expect(screen.queryByLabelText("Role for other@example.com")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });

  // Leaving is not a management action: remove_organization_member authorises a
  // caller who IS the target, whatever their role, so a MEMBER who can manage
  // nobody can still choose to leave.
  it("offers a MEMBER \"Leave\" on their OWN row", () => {
    render(
      <MemberRow
        member={{ user_id: OWNER_ID, email: "me@example.com", role: "MEMBER" }}
        currentUserId={OWNER_ID}
        currentUserRole="MEMBER"
      />,
    );

    expect(screen.getByRole("button", { name: "Leave" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });

  it("labels your own row so a destructive click is not a surprise", () => {
    render(<MemberRow member={owner} currentUserId={OWNER_ID} currentUserRole="OWNER" />);

    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leave" })).toBeInTheDocument();
  });
});
