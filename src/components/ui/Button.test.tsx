import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("defaults to the secondary variant and md size", () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveClass("border-hairline");
    expect(btn).toHaveClass("text-body-md");
  });

  it("renders the primary variant on the accent token", () => {
    render(<Button variant="primary">Save</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-accent", "text-accent-fg");
  });

  it("renders the danger variant on the danger token", () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-danger", "text-danger-fg");
  });

  it("carries no elevation shadow in any variant", () => {
    const variants = ["primary", "secondary", "ghost", "danger"] as const;
    for (const variant of variants) {
      const { unmount } = render(<Button variant={variant}>x</Button>);
      const cls = screen.getByRole("button").className;
      expect(cls).not.toMatch(/shadow-elevation/);
      unmount();
    }
  });

  it("applies the sm size", () => {
    render(<Button size="sm">Save</Button>);
    expect(screen.getByRole("button")).toHaveClass("text-body-sm");
  });

  it("disables when disabled", () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("disables and marks itself busy when loading", () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("is not busy when not loading", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy");
  });

  it("merges a caller className", () => {
    render(<Button className="w-full">Save</Button>);
    expect(screen.getByRole("button")).toHaveClass("w-full");
  });

  it("forwards native props", () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  // asChild is the escape hatch that replaces hand-copied class strings.
  it("renders the child element instead of a button under asChild", () => {
    render(
      <Button asChild variant="secondary">
        <a href="/reset-password">Change password</a>
      </Button>,
    );
    expect(screen.queryByRole("button")).toBeNull();
    const link = screen.getByRole("link", { name: "Change password" });
    expect(link).toHaveAttribute("href", "/reset-password");
  });

  it("gives the asChild child the same classes the button would get", () => {
    render(
      <Button asChild variant="secondary">
        <a href="/x">Go</a>
      </Button>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveClass("border-hairline", "bg-canvas-pure", "text-ink-main", "text-body-md");
    expect(link.className).not.toMatch(/shadow-elevation/);
  });

  it("never puts a disabled attribute on an asChild anchor", () => {
    render(
      <Button asChild disabled>
        <a href="/x">Go</a>
      </Button>,
    );
    expect(screen.getByRole("link")).not.toHaveAttribute("disabled");
  });

  // Slot clones exactly one child, so the spinner must not be prepended.
  it("suppresses the loading spinner under asChild", () => {
    render(
      <Button asChild loading>
        <a href="/x">Go</a>
      </Button>,
    );
    const link = screen.getByRole("link");
    expect(link.querySelector(".animate-spin")).toBeNull();
    expect(link).toHaveTextContent("Go");
  });
});
