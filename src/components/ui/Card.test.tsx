import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./Card";

describe("Card", () => {
  it("is a Level 0 surface by default: hairline border, no shadow", () => {
    render(<Card>Body</Card>);
    const card = screen.getByText("Body");
    expect(card).toHaveClass("border-hairline");
    expect(card.className).not.toMatch(/shadow-elevation/);
  });

  it("is not marked cold by default", () => {
    render(<Card>Body</Card>);
    expect(screen.getByText("Body")).not.toHaveAttribute("data-cold");
  });

  it("switches to a dashed cold border when overdue", () => {
    render(<Card cold>Body</Card>);
    const card = screen.getByText("Body");
    expect(card).toHaveClass("border-dashed", "border-cold");
    expect(card).not.toHaveClass("border-hairline");
  });

  it("exposes the cold state as a data attribute", () => {
    render(<Card cold>Body</Card>);
    expect(screen.getByText("Body")).toHaveAttribute("data-cold", "true");
  });

  it("merges a caller className", () => {
    render(<Card className="w-64">Body</Card>);
    expect(screen.getByText("Body")).toHaveClass("w-64");
  });
});
