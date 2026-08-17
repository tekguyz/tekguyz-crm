import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

// WHY THIS IS A CLASS-LEVEL ASSERTION AND NOT A PAINT TEST
// -------------------------------------------------------
// The thing actually being protected is the global `:focus-visible` rule in
// `src/app/globals.css` — this app's accessibility floor. shadcn's upstream
// dropdown-menu carries `outline-none` on every row, and copying that class in
// silently deletes that floor for the whole menu: no error, green build, all
// tests pass. It has already reached `DropdownMenuItem` once that way, and
// anyone re-porting the part from the live registry (which CLAUDE.md's own
// primitive-source recipe tells them to do) would reintroduce it.
//
// A *true* assertion would focus a row and read a painted outline. That is not
// reachable here: these tests run in jsdom, whose `getComputedStyle` does not
// apply stylesheet rules — and `vitest.config.mts` sets `css: false`, so the
// stylesheet is never even loaded. Any outline read would come back empty for
// both the correct and the broken component, i.e. it would prove nothing.
//
// So the assertion is on the resolved className: the row must not carry any
// utility that suppresses the outline. That catches the exact regression (the
// class being copied back in) at the exact place it enters the codebase.
//
// What a browser-based runner (Playwright, or vitest browser mode) would add
// on top: focus a row with a real keyboard event, then assert a non-`none`
// computed `outline-width`/`outline-color` — proving the ring genuinely paints
// rather than merely that nothing forbids it. Neither is installed in this
// repo (see package.json), so that assertion is out of reach today.
//
// Scope note, per CLAUDE.md: the exemption is deliberate. Overlay CONTENT
// boxes may keep `outline-none` — `DropdownMenuContent` does, correctly, and
// is therefore NOT asserted against here. Interactive ROWS may not.
const OUTLINE_SUPPRESSORS = [
  "outline-none",
  "outline-0",
  "focus:outline-none",
  "focus-visible:outline-none",
];

function expectNoOutlineSuppression(element: HTMLElement) {
  const classes = element.className.split(/\s+/);
  for (const suppressor of OUTLINE_SUPPRESSORS) {
    expect(
      classes,
      `"${suppressor}" would delete the global :focus-visible ring for this row`,
    ).not.toContain(suppressor);
  }
}

describe("dropdown-menu focus-ring floor", () => {
  it("does not suppress the focus outline on DropdownMenuItem", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expectNoOutlineSuppression(screen.getByRole("menuitem", { name: "Sign out" }));
  });

  // The danger variant takes a different className path through `cn`, so it is
  // asserted separately rather than assumed to match the default.
  it("does not suppress the focus outline on a danger DropdownMenuItem", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem variant="danger">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expectNoOutlineSuppression(screen.getByRole("menuitem", { name: "Delete" }));
  });

  it("does not suppress the focus outline on DropdownMenuRadioItem", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="dark">
            <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    for (const row of screen.getAllByRole("menuitemradio")) {
      expectNoOutlineSuppression(row);
    }
  });

  // A caller passing its own className must not be able to smuggle the class
  // back in either — `cn` would happily merge it, and that is the same
  // regression arriving through a different door.
  it("does not let a caller reintroduce outline-none through className", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem className="gap-3">Help</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expectNoOutlineSuppression(screen.getByRole("menuitem", { name: "Help" }));
  });

  // Guard against the part growing new row types that quietly ship with
  // shadcn's `outline-none`. If DropdownMenuCheckboxItem / SubTrigger are added
  // later (neither exists today — the file is deliberately partial), this
  // sweeps them too without anyone remembering to add a case above.
  it("suppresses the outline on no interactive row in an open menu", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Sign out</DropdownMenuItem>
          <DropdownMenuRadioGroup value="dark">
            <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const rows = document.querySelectorAll<HTMLElement>(
      '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [data-slot="dropdown-menu-sub-trigger"]',
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expectNoOutlineSuppression(row);
    }
  });
});
