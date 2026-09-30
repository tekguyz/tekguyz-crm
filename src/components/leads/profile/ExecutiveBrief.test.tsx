import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExecutiveBrief } from "./ExecutiveBrief";

describe("ExecutiveBrief", () => {
  it("shows a single line break as a line break, so a Day 0 message keeps its shape (#37)", () => {
    const { container } = render(<ExecutiveBrief brief={"Hi LJ team,\nWould a booking page help?"} />);

    expect(container.querySelectorAll("br")).toHaveLength(1);
    expect(screen.getByText(/Hi LJ team,/)).toBeInTheDocument();
  });

  it("treats Windows line endings the same way", () => {
    const { container } = render(<ExecutiveBrief brief={"One,\r\ntwo.\r\n\r\nThree."} />);

    expect(container.querySelectorAll("br")).toHaveLength(1);
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("still makes a blank line a new paragraph, and still renders Markdown", () => {
    const { container } = render(<ExecutiveBrief brief={"First.\n\n**Second.**\n- one\n- two"} />);

    expect(container.querySelectorAll("p")).toHaveLength(2);
    expect(container.querySelector("strong")).toHaveTextContent("Second.");
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });
});
