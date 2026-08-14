import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Select } from "./Select";

function options() {
  return (
    <>
      <option value="new">New</option>
      <option value="won">Won</option>
    </>
  );
}

describe("Select", () => {
  it("associates a label with the field", () => {
    render(<Select label="Status">{options()}</Select>);
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
  });

  it("renders its options", () => {
    render(<Select label="Status">{options()}</Select>);
    expect(screen.getByRole("option", { name: "Won" })).toBeInTheDocument();
  });

  it("marks itself invalid and links the error message", () => {
    render(
      <Select label="Status" error="Pick one">
        {options()}
      </Select>,
    );
    const field = screen.getByLabelText("Status");
    expect(field).toHaveAttribute("aria-invalid", "true");
    const describedBy = field.getAttribute("aria-describedby");
    expect(document.getElementById(describedBy!)).toHaveTextContent("Pick one");
  });

  it("switches the border to the danger token on error", () => {
    render(
      <Select label="Status" error="Pick one">
        {options()}
      </Select>,
    );
    expect(screen.getByLabelText("Status")).toHaveClass("border-danger");
  });

  it("hides the chevron from assistive tech and from the pointer", () => {
    const { container } = render(<Select label="Status">{options()}</Select>);
    const chevron = container.querySelector("[aria-hidden='true']");
    expect(chevron).toBeTruthy();
    expect(chevron).toHaveClass("pointer-events-none");
  });

  it("forwards native props", () => {
    render(
      <Select label="Status" defaultValue="won" required>
        {options()}
      </Select>,
    );
    const field = screen.getByLabelText("Status");
    expect(field).toBeRequired();
    expect(field).toHaveValue("won");
  });
});
