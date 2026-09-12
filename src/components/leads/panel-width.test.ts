import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { LEAD_PANEL_WIDTH } from "./panel-width";

// A SOURCE-LEVEL TEST, deliberately. What it pins is not what a component
// renders but whether the three lead overlays still read ONE width from one
// place — and that is a property of the files, not of any single render.
//
// It matters because the failure mode is silent. Reading a lead and editing
// one share a slot on screen; if one of them grows a cap of its own, nothing
// errors, no render test fails, and the panel simply resizes when you move
// between reading and editing. That is the exact inconsistency the 2026-09-12
// review picked the Drawer to avoid.
//
// Same shape as the existing source-level assertion on the is_demo guard in
// audio-transcription.test.ts: a rule about where code lives needs a test that
// reads code.
const DIR = fileURLToPath(new URL(".", import.meta.url));

const FILES = {
  "ProfileSheet.tsx": `${DIR}profile/ProfileSheet.tsx`,
  "EditLeadDrawer.tsx": `${DIR}EditLeadDrawer.tsx`,
  "CreateLeadDrawer.tsx": `${DIR}CreateLeadDrawer.tsx`,
};

describe("the lead panels share one width ramp", () => {
  it("ramps full-bleed to 512 to 672", () => {
    expect(LEAD_PANEL_WIDTH).toBe("sm:max-w-lg lg:max-w-2xl");
  });

  for (const [name, path] of Object.entries(FILES)) {
    it(`${name} reads the shared constant instead of naming a width`, () => {
      const source = readFileSync(path, "utf8");

      expect(source).toContain("LEAD_PANEL_WIDTH");
      // No hand-written cap anywhere in the file. A second one would not
      // conflict with the constant — tailwind-merge would simply pick one —
      // so this has to be an absence assertion, not a comparison.
      expect(source).not.toMatch(/\bmax-w-/);
    });
  }
});
