import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("associates a label with the field", () => {
    render(<Textarea label="Notes" />);
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
  });

  it("marks itself invalid and links the error message", () => {
    render(<Textarea label="Notes" error="Too long" />);
    const field = screen.getByLabelText("Notes");
    expect(field).toHaveAttribute("aria-invalid", "true");
    const describedBy = field.getAttribute("aria-describedby");
    expect(document.getElementById(describedBy!)).toHaveTextContent("Too long");
  });

  it("links the hint when there is no error", () => {
    render(<Textarea label="Notes" hint="Markdown supported" />);
    const field = screen.getByLabelText("Notes");
    expect(field).not.toHaveAttribute("aria-invalid");
    const describedBy = field.getAttribute("aria-describedby");
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      "Markdown supported",
    );
  });

  it("forwards native props", () => {
    render(<Textarea label="Notes" rows={6} />);
    expect(screen.getByLabelText("Notes")).toHaveAttribute("rows", "6");
  });
});
