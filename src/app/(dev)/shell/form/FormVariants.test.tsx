import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DrawerForm } from "./drawer/DrawerForm";
import { InlineForm } from "./inline/InlineForm";
import { ModalForm } from "./modal/ModalForm";
import {
  EMPTY_LEAD_FORM,
  MOCK_LEAD_FORM,
  MOCK_LEAD_FORM_LONG,
  assigneeOptionLabel,
} from "./preview/mock-form";

// The three variants differ in CONTAINER only. These tests pin everything that
// must NOT differ between them — the field set, the edit-is-create claim, and
// the React 19 form-reset survival the whole project depends on. Layout itself
// is judged on /shell/form and by scripts/check-comp-text-widths.mjs, not here:
// jsdom has no layout engine, so every box it reports is 0x0 and a width
// assertion here would pass vacuously.

const VARIANTS = [
  ["Modal", ModalForm],
  ["Drawer", DrawerForm],
  ["Inline", InlineForm],
] as const;

// The six fields, by the accessible name a user actually sees. Written out
// rather than derived from the component, so a field silently disappearing
// from FormBody fails this list instead of quietly agreeing with it.
const FIELD_LABELS = [
  "Client name",
  "Company",
  "Estimated revenue",
  "Next action",
  "Assigned to",
  "Star this lead",
];

describe.each(VARIANTS)("Variant %s", (_name, Variant) => {
  it("renders the same six fields as every other variant", () => {
    render(<Variant mode="edit" initial={MOCK_LEAD_FORM} />);

    for (const label of FIELD_LABELS) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it("is one component: edit is create with values in it", () => {
    const { unmount } = render(<Variant mode="create" initial={EMPTY_LEAD_FORM} />);
    expect(screen.getByLabelText("Client name")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Create lead" })).toBeInTheDocument();
    unmount();

    render(<Variant mode="edit" initial={MOCK_LEAD_FORM} />);
    // Same labelled controls, same order, different starting values — the two
    // modes are one layout. A second design for editing would fail here.
    expect(screen.getByLabelText("Client name")).toHaveValue("Melissa Trent");
    expect(screen.getByLabelText("Company")).toHaveValue("Trent Family HVAC");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    for (const label of FIELD_LABELS) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  // THE REGRESSION THAT COSTS REAL DATA. React 19 calls form.reset() after an
  // action returns, failure included. Driven with a real reset event, never
  // with rerender() — RTL's rerender re-applies the controlled value and would
  // mask the exact failure this asserts. See CLAUDE.md § Form/Action Field
  // Parity.
  it("keeps the select and the checkbox through a form reset", async () => {
    const user = userEvent.setup();
    render(<Variant mode="edit" initial={MOCK_LEAD_FORM} />);

    const assignee = screen.getByLabelText("Assigned to") as HTMLSelectElement;
    const star = screen.getByLabelText("Star this lead");

    // Any option other than the one it starts on, so the reset has something
    // to lose.
    const other = [...assignee.options].find((option) => option.value !== assignee.value);
    await user.selectOptions(assignee, other!.value);
    const chosen = assignee.value;
    expect(chosen).not.toBe(MOCK_LEAD_FORM.assigned_to);
    await user.click(star);
    const intended = star.getAttribute("data-state");

    await user.click(screen.getByRole("button", { name: /Simulate failed save/ }));

    await waitFor(() => {
      expect(assignee.value).toBe(chosen);
      expect(star).toHaveAttribute("data-state", intended!);
    });
  });

  it("keeps an assignee the org can no longer resolve selectable", () => {
    render(<Variant mode="edit" initial={MOCK_LEAD_FORM_LONG} />);

    const assignee = screen.getByLabelText("Assigned to") as HTMLSelectElement;
    // A controlled <select> holding an id with no matching <option> renders
    // blank, which would silently report a lead as unassigned.
    expect(assignee.value).toBe(MOCK_LEAD_FORM_LONG.assigned_to);
    expect(screen.getByRole("option", { name: "Former member" })).toBeInTheDocument();
  });
});

describe("the fixtures", () => {
  it("give the width check something to squeeze", () => {
    // The ordinary fixture never stresses a layout, so a width check run over
    // it would pass by never testing anything. These are the values
    // scripts/check-comp-text-widths.mjs drives through ?long=1.
    expect(MOCK_LEAD_FORM_LONG.client_name.length).toBeGreaterThan(
      MOCK_LEAD_FORM.client_name.length,
    );
    expect(MOCK_LEAD_FORM_LONG.company.length).toBeGreaterThan(MOCK_LEAD_FORM.company.length);
    expect(assigneeOptionLabel(MOCK_LEAD_FORM_LONG.assigned_to)).toBe("Former member");
  });

  it("carries no field the real leads table does not have", () => {
    // The trimmed set is prompt 3's, reused rather than re-derived. If a
    // seventh key appears here, it is scope creep and Stage 2 inherits it.
    expect(Object.keys(EMPTY_LEAD_FORM).sort()).toEqual(
      [
        "assigned_to",
        "client_name",
        "company",
        "estimated_revenue",
        "is_starred",
        "next_action_at",
      ].sort(),
    );
  });
});
