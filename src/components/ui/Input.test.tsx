import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("associates a label with the field", () => {
    render(<Input label="Company" />);
    expect(screen.getByLabelText("Company")).toBeInTheDocument();
  });

  it("prefers a caller-supplied id over the generated one", () => {
    render(<Input id="company-field" label="Company" />);
    expect(screen.getByLabelText("Company")).toHaveAttribute(
      "id",
      "company-field",
    );
  });

  it("renders without a label", () => {
    render(<Input placeholder="Search" />);
    expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
  });

  it("marks itself invalid and links the error message", () => {
    render(<Input label="Email" error="Not a valid email" />);
    const field = screen.getByLabelText("Email");
    expect(field).toHaveAttribute("aria-invalid", "true");
    const describedBy = field.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      "Not a valid email",
    );
  });

  it("links the hint when there is no error", () => {
    render(<Input label="Email" hint="We never share this" />);
    const field = screen.getByLabelText("Email");
    expect(field).not.toHaveAttribute("aria-invalid");
    const describedBy = field.getAttribute("aria-describedby");
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      "We never share this",
    );
  });

  it("shows only the error when both error and hint are given", () => {
    render(<Input label="Email" hint="We never share this" error="Required" />);
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.queryByText("We never share this")).not.toBeInTheDocument();
  });

  it("switches the border to the danger token on error", () => {
    render(<Input label="Email" error="Required" />);
    expect(screen.getByLabelText("Email")).toHaveClass("border-danger");
  });

  it("uses the hairline border when valid", () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText("Email")).toHaveClass("border-hairline");
  });

  it("forwards native props", () => {
    render(<Input label="Email" type="email" required />);
    const field = screen.getByLabelText("Email");
    expect(field).toHaveAttribute("type", "email");
    expect(field).toBeRequired();
  });
});
