import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CenteredLogin } from "./centered/CenteredLogin";
import { MastheadLogin } from "./masthead/MastheadLogin";
import { DEMO_HREF, EMPTY_LOGIN, LOGIN_ERROR, LOGIN_MESSAGE } from "./preview/mock-login";
import { SplitLogin } from "./split/SplitLogin";

// The three variants differ in LAYOUT only. These tests pin what must not
// differ: the field set, the banners, the demo way in, and the absence of a
// sign-up link. Layout itself is judged on /shell/login and by
// scripts/check-comp-text-widths.mjs — jsdom lays nothing out.
const VARIANTS = [
  ["Centered", CenteredLogin],
  ["Split", SplitLogin],
  ["Masthead", MastheadLogin],
] as const;

describe.each(VARIANTS)("Variant %s", (_name, Variant) => {
  it("renders exactly the real page's two named fields, labelled", () => {
    const { container } = render(<Variant fixture={EMPTY_LOGIN} />);

    const names = [...container.querySelectorAll("[name]")].map((el) => el.getAttribute("name"));
    expect(names.sort()).toEqual(["email", "password"]);
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("has one Sign in button, a forgot-password link and the demo link", () => {
    render(<Variant fixture={EMPTY_LOGIN} />);

    expect(screen.getAllByRole("button", { name: "Sign in" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /forgot password/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /demo/i })).toHaveAttribute("href", DEMO_HREF);
  });

  it("never offers a sign-up link — accounts are invite-only", () => {
    render(<Variant fixture={EMPTY_LOGIN} />);

    for (const link of screen.getAllByRole("link")) {
      expect(link.textContent).not.toMatch(/sign ?up|create account|register/i);
      expect(link.getAttribute("href")).not.toMatch(/signup/);
    }
  });

  it("points nothing at a real auth route", () => {
    const { container } = render(<Variant fixture={EMPTY_LOGIN} />);

    // /demo mints a session, and a real form action would post credentials.
    // A comp does neither.
    for (const anchor of container.querySelectorAll("a[href]")) {
      expect(anchor.getAttribute("href")).not.toMatch(/^\/(demo|forgot-password|login)/);
    }
    expect(container.querySelector("form")?.getAttribute("action")).toBeNull();
  });

  it("cancels its own submit", () => {
    const { container } = render(<Variant fixture={EMPTY_LOGIN} />);
    const form = container.querySelector("form")!;

    const event = new Event("submit", { bubbles: true, cancelable: true });
    fireEvent(form, event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("shows no banner when there is nothing to say", () => {
    render(<Variant fixture={EMPTY_LOGIN} />);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("announces the error and the notice in their own roles", () => {
    render(<Variant fixture={{ email: "", error: LOGIN_ERROR, message: LOGIN_MESSAGE }} />);

    expect(screen.getByRole("alert")).toHaveTextContent(LOGIN_ERROR);
    expect(screen.getByRole("status")).toHaveTextContent(LOGIN_MESSAGE);
  });
});
