import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RootError from "@/app/error";
import AppError from "@/app/(app)/error";
import PipelineError from "@/app/(app)/pipeline/error";
import { DEMO_READ_ONLY_DIGEST } from "@/lib/demo/read-only-refusal";

// All three boundaries a refused demo write can land in. A task control inside
// the profile sheet throws from the layout, so it reaches the ROOT boundary,
// not (app)'s — which is why the digest, not a shell context, carries the
// "this is the demo" fact.
const BOUNDARIES = [
  ["root", RootError],
  ["(app)", AppError],
  ["pipeline", PipelineError],
] as const;

const reset = () => {};

describe.each(BOUNDARIES)("the %s error boundary", (_name, Boundary) => {
  it("explains a refused demo write instead of looking broken", () => {
    const error = Object.assign(new Error("redacted"), { digest: DEMO_READ_ONLY_DIGEST });
    render(<Boundary error={error} reset={reset} />);

    expect(screen.getByText("This demo is read-only")).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong|couldn.t load/i)).not.toBeInTheDocument();
  });

  it("still shows the real error for anything else", () => {
    const error = Object.assign(new Error("redacted"), { digest: "2715380113" });
    render(<Boundary error={error} reset={reset} />);

    expect(screen.queryByText("This demo is read-only")).not.toBeInTheDocument();
    expect(screen.getByText(/something went wrong|couldn.t load/i)).toBeInTheDocument();
  });
});
