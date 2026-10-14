import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PasswordInput } from "./PasswordInput";

describe("PasswordInput", () => {
  it("gives the show/hide toggle a 44px hit area on a phone", () => {
    render(<PasswordInput name="password" />);
    expect(screen.getByRole("button", { name: "Show password" })).toHaveClass("max-sm:after:-inset-3.5");
  });
});
