import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Modal } from "./Modal";

describe("Modal", () => {
  it("makes the close button 44px on a phone", () => {
    // open={false}: jsdom has no showModal(), and the class is all this checks.
    render(
      <Modal open={false} onClose={vi.fn()} title="Title">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByRole("button", { name: "Close", hidden: true })).toHaveClass("max-sm:size-11");
  });
});
