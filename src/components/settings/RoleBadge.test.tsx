import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RoleBadge, roleLabel, roleTone } from "@/components/settings/RoleBadge";

describe("RoleBadge", () => {
  it("gives each role its own hue and its word", () => {
    expect(roleTone("OWNER")).toBe("purple");
    expect(roleTone("ADMIN")).toBe("sky");
    expect(roleTone("MEMBER")).toBe("teal");
    expect(roleLabel("OWNER")).toBe("Owner");
  });

  it("falls back to neutral and a readable label for an unknown role", () => {
    expect(roleTone("GUEST")).toBe("neutral");
    expect(roleLabel("GUEST")).toBe("Guest");
  });

  it("renders the role's word, so colour is never the only cue", () => {
    render(<RoleBadge role="ADMIN" />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });
});
