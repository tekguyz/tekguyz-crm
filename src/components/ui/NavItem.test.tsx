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
});
