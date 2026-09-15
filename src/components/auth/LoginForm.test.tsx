import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/actions", () => ({
  signIn: vi.fn(),
}));

const { LoginForm } = await import("./LoginForm");
const { LoginEmailProvider } = await import("./LoginEmailProvider");

describe("LoginForm — the real /login form", () => {
  it("renders exactly signIn's field set, with visible labels", () => {
    const { container } = render(<LoginForm />);

    const names = [...container.querySelectorAll("[name]")].map((el) => el.getAttribute("name"));
    expect(names.sort()).toEqual(["email", "password"]);
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
  });

  it("carries `next` as a hidden field only when the URL gave one", () => {
    const { container } = render(<LoginForm next="/pipeline" />);

    const hidden = container.querySelector('input[name="next"]');
    expect(hidden).toHaveAttribute("type", "hidden");
    expect(hidden).toHaveValue("/pipeline");
  });

  // React 19 calls form.reset() after the action returns, failure included,
  // and a wrong password is exactly that. Test with reset(), never rerender():
  // a rerender re-applies the controlled value whether or not the real app
  // would.
  it("keeps the typed email when the form is reset after a failed sign-in", async () => {
    const user = userEvent.setup();
    const { container } = render(<LoginForm error="Invalid login credentials" />);

    await user.type(screen.getByLabelText("Email"), "sam@tekguyz.com");
    container.querySelector("form")!.reset();

    expect(screen.getByLabelText("Email")).toHaveValue("sam@tekguyz.com");
  });

  // signIn's error redirect REMOUNTS the page on Next 15.5 (measured in real
  // Chrome, 2026-09-15), so surviving reset() is not enough. A key change is a
  // genuine remount, unlike rerender() with the same key.
  it("keeps the typed email when the page remounts under the (login) layout", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <LoginEmailProvider>
        <LoginForm key="before" />
      </LoginEmailProvider>,
    );
    const before = screen.getByLabelText("Email");
    await user.type(before, "sam@tekguyz.com");

    rerender(
      <LoginEmailProvider>
        <LoginForm key="after" error="Invalid login credentials" />
      </LoginEmailProvider>,
    );

    const after = screen.getByLabelText("Email");
    expect(after).not.toBe(before);
    expect(after).toHaveValue("sam@tekguyz.com");
  });

  it("shows no banner when there is nothing to say", () => {
    render(<LoginForm />);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("paints the error with --danger, never the pill palette", () => {
    render(<LoginForm error="Invalid login credentials" />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Invalid login credentials");
    expect(alert).toHaveClass("border-danger", "text-danger");
    expect(alert.className).not.toMatch(/pill/);
  });

  it("announces the notice in its own role", () => {
    render(<LoginForm message="Check your email to confirm your account, then log in." />);

    expect(screen.getByRole("status")).toHaveTextContent(/check your email/i);
  });
});
