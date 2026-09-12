import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FullDrawerForm } from "./full/FullDrawerForm";
import {
  FULL_FORM_SECTIONS,
  MOCK_FULL_FORM,
  MOCK_FULL_FORM_LONG,
} from "./preview/mock-form-full";

// The real-scale drawer. These tests pin the things a screenshot cannot show
// and a width measurement cannot either — above all that a COLLAPSED SECTION
// STILL CARRIES ITS FIELDS.
//
// Layout is judged on the page and by scripts/check-comp-text-widths.mjs;
// jsdom has no layout engine, so nothing here asserts a pixel.

function controls(container: HTMLElement): HTMLElement[] {
  return [
    ...container.querySelectorAll<HTMLElement>(
      "input:not([type=hidden]):not([type=checkbox]), select, button[role=checkbox]",
    ),
  ];
}

describe("the real-scale drawer", () => {
  it("mounts all 18 fields even with two sections collapsed", () => {
    const { container } = render(<FullDrawerForm initial={MOCK_FULL_FORM} />);

    // THE ONE THAT MATTERS. An unmounted input contributes nothing to
    // FormData, so a collapsed group whose fields were unmounted would make
    // `updateLead` read null for every column behind it and NULL them on save
    // — the exact silent data-loss shape CLAUDE.md § Form/Action Field Parity
    // exists to stop, arriving by a brand-new route. Collapse must hide, never
    // unmount.
    expect(controls(container)).toHaveLength(18);
  });

  it("starts with exactly the two working sections open", () => {
    render(<FullDrawerForm initial={MOCK_FULL_FORM} />);

    for (const section of FULL_FORM_SECTIONS) {
      const header = screen.getByRole("button", { name: new RegExp(section.label, "i") });
      expect(header).toHaveAttribute(
        "aria-expanded",
        section.openByDefault ? "true" : "false",
      );
    }
  });

  it("says how much is behind a closed section before you open it", () => {
    render(<FullDrawerForm initial={MOCK_FULL_FORM} />);

    // A closed group with no count is a promise about content you cannot see.
    // Same reasoning as the counts added to the picked detail panel's jump
    // strip. The four counts must also add up to the real field total.
    const total = FULL_FORM_SECTIONS.reduce((sum, section) => sum + section.fields, 0);
    expect(total).toBe(18);

    for (const section of FULL_FORM_SECTIONS) {
      const header = screen.getByRole("button", { name: new RegExp(section.label, "i") });
      expect(header).toHaveTextContent(String(section.fields));
    }
  });

  it("opens a collapsed section on click", async () => {
    const user = userEvent.setup();
    render(<FullDrawerForm initial={MOCK_FULL_FORM} />);

    const header = screen.getByRole("button", { name: /Address & social profiles/i });
    expect(header).toHaveAttribute("aria-expanded", "false");

    await user.click(header);

    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Physical address")).toBeVisible();
  });

  it("keeps its three selects and its checkbox through a form reset", async () => {
    const user = userEvent.setup();
    render(<FullDrawerForm initial={MOCK_FULL_FORM} />);

    const status = screen.getByLabelText("Status") as HTMLSelectElement;
    const assignee = screen.getByLabelText("Assigned to") as HTMLSelectElement;
    const star = screen.getByLabelText("Starred");

    await user.selectOptions(status, "ACTIVE");
    const otherAssignee = [...assignee.options].find((o) => o.value !== assignee.value)!;
    await user.selectOptions(assignee, otherAssignee.value);
    await user.click(star);
    const intended = star.getAttribute("data-state");

    // A REAL reset event — the one React 19 fires after an action returns.
    // Never rerender(), which re-applies the controlled value and masks this.
    await user.click(screen.getByRole("button", { name: /Simulate failed save/ }));

    await waitFor(() => {
      expect(status.value).toBe("ACTIVE");
      expect(assignee.value).toBe(otherAssignee.value);
      expect(star).toHaveAttribute("data-state", intended!);
    });
  });

  it("keeps the submit button outside the scrolling area", () => {
    const { container } = render(<FullDrawerForm initial={MOCK_FULL_FORM_LONG} />);

    const submit = screen.getByRole("button", { name: "Save changes" });
    const scroller = container.querySelector("form > div.overflow-y-auto");

    // The pinned action bar is the actual answer to "I always have to scroll
    // to the bottom to save". jsdom cannot measure that it stays on screen, so
    // what is pinned here is the structural fact underneath it: Save is not a
    // descendant of the scrolling element.
    expect(scroller).not.toBeNull();
    expect(scroller!.contains(submit)).toBe(false);
  });
});
