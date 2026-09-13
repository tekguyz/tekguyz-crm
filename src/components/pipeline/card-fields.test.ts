import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// A SOURCE-LEVEL TEST, deliberately — same shape as panel-width.test.ts. What it
// pins is not what a card renders but where the field block LIVES: once, in
// PipelineCardFields, read by both pipeline cards.
//
// The failure mode is silent. KanbanCard and FocusListCard used to carry two
// identical hand-written copies of the field block; the next edit to either
// would have made desktop and mobile show different fields, with no error and
// no failing render test, because each card would still render correctly on
// its own. A rule about where code lives needs a test that reads code.
const DIR = fileURLToPath(new URL(".", import.meta.url));

const CARDS = {
  "KanbanCard.tsx": `${DIR}KanbanCard.tsx`,
  "FocusListCard.tsx": `${DIR}FocusListCard.tsx`,
};

// Each of these is something only the field block has a reason to touch. A
// card that names any of them is building its own copy of the block.
const FIELD_BLOCK_MARKERS = [
  // As a JSX child only: FocusListCard's select legitimately names the lead in
  // its aria-label, which is `${lead.client_name}` and is not the block.
  />\{lead\.client_name\}/,
  /lead\.company\b/,
  /lead\.is_starred\b/,
  /\bformatCurrency\b/,
  /\bformatDueAt\b/,
  /\bIconStar\b/,
  /\bAssigneeLabel\b/,
];

describe("the pipeline cards share one field block", () => {
  it("PipelineCardFields owns every field the block renders", () => {
    const source = readFileSync(`${DIR}PipelineCardFields.tsx`, "utf8");
    for (const marker of FIELD_BLOCK_MARKERS) {
      expect(source).toMatch(marker);
    }
  });

  for (const [name, path] of Object.entries(CARDS)) {
    it(`${name} renders PipelineCardFields`, () => {
      const source = readFileSync(path, "utf8");
      expect(source).toContain('from "@/components/pipeline/PipelineCardFields"');
      expect(source).toMatch(/<PipelineCardFields\b/);
    });

    it(`${name} defines no copy of the field block`, () => {
      const source = readFileSync(path, "utf8");
      for (const marker of FIELD_BLOCK_MARKERS) {
        expect(source).not.toMatch(marker);
      }
    });
  }
});
