import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils/cn";

// Temporary: Vitest exits non-zero when it finds no test files at all, and the
// real primitive suites do not land until the Button task. Delete this the
// moment src/components/ui/Button.test.tsx exists.
describe("harness", () => {
  it("resolves the @ alias", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
