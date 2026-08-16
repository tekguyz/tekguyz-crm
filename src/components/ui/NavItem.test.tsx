import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// next/link needs App Router context that jsdom does not provide. NavItem's
// contract is its markup and aria wiring, not Next's navigation, so the link is
// stubbed to a plain anchor.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const { NavItem } = await import("./NavItem");

function StubIcon({ className }: { className?: string }) {
  return <svg data-testid="icon" className={className} />;
}

describe("NavItem", () => {
  it("renders a link to its href", () => {
    render(
      <NavItem href="/pipeline" icon={StubIcon}>
        Pipeline
      </NavItem>,
    );
    expect(screen.getByRole("link", { name: /Pipeline/ })).toHaveAttribute(
      "href",
      "/pipeline",
    );
  });

  it("renders its icon", () => {
    render(
      <NavItem href="/pipeline" icon={StubIcon}>
        Pipeline
      </NavItem>,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("is not marked current when inactive", () => {
    render(
      <NavItem href="/pipeline" icon={StubIcon}>
        Pipeline
      </NavItem>,
    );
    expect(screen.getByRole("link")).not.toHaveAttribute("aria-current");
  });

  it("marks itself as the current page when active", () => {
    render(
      <NavItem href="/pipeline" icon={StubIcon} active>
        Pipeline
      </NavItem>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("aria-current", "page");
  });

  it("uses the accent token only when active", () => {
    const { unmount } = render(
      <NavItem href="/pipeline" icon={StubIcon} active>
        Pipeline
      </NavItem>,
    );
    expect(screen.getByRole("link")).toHaveClass("text-accent");
    unmount();

    render(
      <NavItem href="/pipeline" icon={StubIcon}>
        Pipeline
      </NavItem>,
    );
    expect(screen.getByRole("link")).not.toHaveClass("text-accent");
  });

  // The collapsed rail hides the label rather than dropping it. If this ever
  // regresses to rendering no label at all, the rail becomes a column of
  // unnamed icons for anyone using a screen reader.
  it("keeps an accessible name in the rail layout", () => {
    render(
      <NavItem href="/pipeline" icon={StubIcon} layout="rail">
        Pipeline
      </NavItem>,
    );
    expect(screen.getByRole("link", { name: "Pipeline" })).toBeInTheDocument();
    expect(screen.getByText("Pipeline")).toHaveClass("sr-only");
  });

  it("shows its label in the row and tab layouts", () => {
    const { unmount } = render(
      <NavItem href="/pipeline" icon={StubIcon} layout="row">
        Pipeline
      </NavItem>,
    );
    expect(screen.getByText("Pipeline")).not.toHaveClass("sr-only");
    unmount();

    render(
      <NavItem href="/pipeline" icon={StubIcon} layout="tab">
        Pipeline
      </NavItem>,
    );
    expect(screen.getByText("Pipeline")).not.toHaveClass("sr-only");
  });

  // Colour alone is not the active signal — every layout also paints an
  // --accent marker bar, which is the only unambiguous "you are here" the rail
  // has. The bar edge differs by layout: leading for row/rail, top for tab.
  it("paints an accent marker bar only when active, on the right edge per layout", () => {
    const { unmount } = render(
      <NavItem href="/pipeline" icon={StubIcon} layout="rail" active>
        Pipeline
      </NavItem>,
    );
    expect(screen.getByRole("link").className).toContain("before:bg-accent");
    expect(screen.getByRole("link").className).toContain("before:left-0");
    unmount();

    const tab = render(
      <NavItem href="/pipeline" icon={StubIcon} layout="tab" active>
        Pipeline
      </NavItem>,
    );
    expect(screen.getByRole("link").className).toContain("before:top-0");
    tab.unmount();

    render(
      <NavItem href="/pipeline" icon={StubIcon} layout="rail">
        Pipeline
      </NavItem>,
    );
    expect(screen.getByRole("link").className).not.toContain("before:bg-accent");
  });
});
