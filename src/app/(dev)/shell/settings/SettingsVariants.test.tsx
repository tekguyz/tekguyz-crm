import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MOCK_ORG, MOCK_ORG_LONG } from "./preview/mock-org";
import { SETTINGS_SECTIONS } from "./preview/sections";
import { RailSettings } from "./rail/RailSettings";
import { SplitSettings } from "./split/SplitSettings";
import { StackedSettings } from "./stacked/StackedSettings";

// The three variants differ in LAYOUT only. These tests pin what must not
// differ — the section set, the scope fence, and the React 19 form-reset
// survival — plus the one behaviour that IS a variant's own idea (Rail swaps
// panes). Layout is judged on /shell/settings and by
// scripts/check-comp-text-widths.mjs; jsdom reports every box as 0x0, so a
// width assertion here would pass without measuring anything.

const VARIANTS = [
  ["Stacked", StackedSettings],
  ["Rail", RailSettings],
  ["Split", SplitSettings],
] as const;

// The four panels the shipped /settings page carries. Three of them are out of
// this prompt's scope, and "out of scope" has to mean absent — not stubbed,
// not a disabled rail row, not reserved space.
const OUT_OF_SCOPE = [/team/i, /member/i, /invite/i, /role/i, /api key/i, /account/i];

describe.each(VARIANTS)("Variant %s", (name, Variant) => {
  it("names all three sections", () => {
    render(<Variant initial={MOCK_ORG} />);

    for (const section of SETTINGS_SECTIONS) {
      // Rail renders only the active pane's body, but every section's NAME is
      // on screen in all three — that is what makes them comparable.
      expect(screen.getAllByText(section.label).length).toBeGreaterThan(0);
    }
  });

  it("shows nothing from the three out-of-scope panels", () => {
    render(<Variant initial={MOCK_ORG} />);

    for (const pattern of OUT_OF_SCOPE) {
      expect(screen.queryAllByText(pattern)).toHaveLength(0);
    }
  });

  it("offers no logo upload", () => {
    const { container } = render(<Variant initial={MOCK_ORG} />);

    // There is no column, no bucket and no upload action, so a control for one
    // would be inventing a data model. Checked at the input type rather than
    // by label, so a differently-worded upload control still fails.
    expect(container.querySelector("input[type=file]")).toBeNull();
  });
});

describe("Variant Stacked and Variant Split", () => {
  // Rail is excluded on purpose: its whole idea is that only one section's
  // body is rendered at a time, so asserting all three bodies here would be
  // asserting that Rail is not Rail.
  it.each([
    ["Stacked", StackedSettings],
    ["Split", SplitSettings],
  ] as const)("%s renders every section's body at once", (_name, Variant) => {
    render(<Variant initial={MOCK_ORG} />);

    expect(screen.getByLabelText("Organization name")).toBeInTheDocument();
    expect(screen.getByText(/no per-organization logo/i)).toBeInTheDocument();
    expect(screen.getByText("Endpoint URL")).toBeInTheDocument();
  });
});

describe("Variant Rail", () => {
  it("swaps the pane instead of scrolling to it", async () => {
    const user = userEvent.setup();
    render(<RailSettings initial={MOCK_ORG} />);

    expect(screen.getByLabelText("Organization name")).toBeInTheDocument();
    expect(screen.queryByText("Endpoint URL")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Inbound lead webhook" }));

    expect(screen.getByText("Endpoint URL")).toBeInTheDocument();
    expect(screen.queryByLabelText("Organization name")).toBeNull();
  });

  it("marks the active rail row as the current page, not as pressed", async () => {
    const user = userEvent.setup();
    render(<RailSettings initial={MOCK_ORG} />);

    const branding = screen.getByRole("button", { name: "Branding" });
    expect(branding).not.toHaveAttribute("aria-current");

    await user.click(branding);

    // aria-current, not aria-pressed: these choose which pane is shown, which
    // is navigation, not a toggle.
    expect(branding).toHaveAttribute("aria-current", "page");
    expect(branding).not.toHaveAttribute("aria-pressed");
  });
});

describe("the organization profile fields", () => {
  it("keeps both selects through a form reset", async () => {
    const user = userEvent.setup();
    // Wrapped in a real <form> because that is what React 19 resets, and
    // useFormResetRestore finds the form by walking up from its anchor.
    render(
      <form>
        <StackedSettings initial={MOCK_ORG} />
        <button type="reset">Simulate failed save</button>
      </form>,
    );

    const timezone = screen.getByLabelText("Timezone") as HTMLSelectElement;
    const currency = screen.getByLabelText("Currency") as HTMLSelectElement;

    await user.selectOptions(timezone, "Europe/London");
    await user.selectOptions(currency, "GBP");

    // A REAL reset event, never rerender() — RTL's rerender re-applies the
    // controlled value and masks the exact failure this pins. React does not
    // restore a <select> by itself after form.reset().
    await user.click(screen.getByRole("button", { name: "Simulate failed save" }));

    await waitFor(() => {
      expect(timezone.value).toBe("Europe/London");
      expect(currency.value).toBe("GBP");
    });
  });

  it("starts from whichever fixture it is handed", () => {
    render(<StackedSettings initial={MOCK_ORG_LONG} />);

    expect(screen.getByLabelText("Organization name")).toHaveValue(MOCK_ORG_LONG.name);
    expect(screen.getByLabelText("Timezone")).toHaveValue(MOCK_ORG_LONG.timezone);
  });
});
