import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./sheet";

describe("Sheet", () => {
  it("makes the built-in close button 44px on a phone", () => {
    render(
      <Sheet open>
        <SheetContent side="bottom">
          <SheetTitle>Title</SheetTitle>
          <SheetDescription>Body</SheetDescription>
        </SheetContent>
      </Sheet>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toHaveClass("size-7", "max-sm:size-11");
  });
});
