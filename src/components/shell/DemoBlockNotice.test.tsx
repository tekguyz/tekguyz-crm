import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RootError from "@/app/error";
import AppError from "@/app/(app)/error";
import PipelineError from "@/app/(app)/pipeline/error";
import { DEMO_BLOCK_DIGEST } from "@/lib/demo/demo-block-message";

// All three boundaries a Demo Block can land in. A control inside the profile
// sheet throws from the layout, so it reaches the ROOT boundary, not (app)'s —
// which is why the digest, not a shell context, carries the "this is the
// demo" fact. A production build redacts a thrown error's message and keeps
// only its digest, so the digest is the one thing that survives the trip.
const BOUNDARIES = [
  ["root", RootError],
  ["(app)", AppError],
  ["pipeline", PipelineError],
] as const;

const reset = () => {};

describe.each(BOUNDARIES)("the %s error boundary", (_name, Boundary) => {
  it("shows the Demo Block, with a way to talk to TEKGUYZ, instead of looking broken", () => {
    const error = Object.assign(new Error("redacted"), { digest: DEMO_BLOCK_DIGEST });
    render(<Boundary error={error} reset={reset} />);

    expect(screen.getByText("Not available in the demo.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Talk to TEKGUYZ/ })).toHaveAttribute(
      "href",
      "https://tekguyz.com/contact",
    );
    expect(screen.queryByText(/something went wrong|couldn.t load/i)).not.toBeInTheDocument();
  });

  it("still shows the real error for anything else", () => {
    const error = Object.assign(new Error("redacted"), { digest: "2715380113" });
    render(<Boundary error={error} reset={reset} />);

    expect(screen.queryByText("Not available in the demo.")).not.toBeInTheDocument();
    expect(screen.getByText(/something went wrong|couldn.t load/i)).toBeInTheDocument();
  });
});
