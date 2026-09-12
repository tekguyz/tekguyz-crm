import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { Lead } from "@/lib/leads/queries";
import type { TeamMember } from "@/lib/invites/queries";
import { MembersProvider } from "@/components/shell/MembersContext";
import { AssignmentField } from "./AssignmentField";

const ALEX = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const RUTH = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const DEPARTED = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const MEMBERS: TeamMember[] = [
  { user_id: ALEX, email: "alex@example.com", role: "OWNER" },
  { user_id: RUTH, email: "ruth@example.com", role: "MEMBER" },
];

// Only assigned_to is meaningful here; the rest of Lead is filled in so the
// type is satisfied without pretending this fixture stands for a real row.
function makeLead(assignedTo: string | null): Lead {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    client_name: "Ben Whitaker",
    email: "ben@example.com",
    assigned_to: assignedTo,
  } as unknown as Lead;
}

function renderField(assignedTo: string | null) {
  return render(
    <MembersProvider members={MEMBERS}>
      <form>
        <AssignmentField lead={makeLead(assignedTo)} />
      </form>
    </MembersProvider>,
  );
}

describe("AssignmentField", () => {
  // Form/Action Field Parity. updateLead reads formData.get("assigned_to").
  // If this <select> ever stops reaching the form — hidden behind a role gate,
  // renamed, moved out of the <form> — leads.assigned_to silently NULLs on
  // every save with no error. These are the assertions that catch that.
  it("carries the current assignee into FormData", () => {
    const { container } = renderField(RUTH);
    const form = container.querySelector("form")!;
    expect(new FormData(form).get("assigned_to")).toBe(RUTH);
  });

  it("posts an empty string, not a missing key, when unassigned", () => {
    const { container } = renderField(null);
    const form = container.querySelector("form")!;
    // updateLead's optionalField() turns "" into NULL. The key must still be
    // present — a missing key and an intentional Unassigned must not look the
    // same to the action.
    expect(new FormData(form).get("assigned_to")).toBe("");
  });

  it("carries a newly picked assignee into FormData", async () => {
    const user = userEvent.setup();
    const { container } = renderField(null);
    await user.selectOptions(screen.getByLabelText("Assigned to"), ALEX);
    const form = container.querySelector("form")!;
    expect(new FormData(form).get("assigned_to")).toBe(ALEX);
  });

  it("offers Unassigned plus every org member, and nobody else", () => {
    renderField(null);
    expect(
      screen.getAllByRole("option").map((o) => (o as HTMLOptionElement).value),
    ).toEqual(["", ALEX, RUTH]);
  });

  // An assignee who has left the org would otherwise fall back to the first
  // option, so a plain save would silently reassign the lead to nobody — the
  // silent-NULL-on-save shape again. The orphan option keeps the real stored
  // value selected and posted unchanged.
  it("keeps an assignee who is no longer a member selected and postable", () => {
    const { container } = renderField(DEPARTED);
    const form = container.querySelector("form")!;
    expect(new FormData(form).get("assigned_to")).toBe(DEPARTED);
    expect(screen.getByRole("option", { name: /Former member/ })).toBeInTheDocument();
  });

  // Assignment has full OWNER/ADMIN/MEMBER parity: unlike OutcomeFields and
  // ArchiveControls, this field takes no role prop and is never hidden.
  it("renders through the shared Select primitive for every role", () => {
    renderField(null);
    expect(screen.getByLabelText("Assigned to").tagName).toBe("SELECT");
  });
});
