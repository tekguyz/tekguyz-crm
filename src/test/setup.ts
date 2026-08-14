import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// React Testing Library normally registers its own afterEach cleanup, but only
// when Vitest globals are enabled. This project runs `globals: false` on
// purpose, so that auto-registration never happens and every rendered tree is
// left mounted in the shared jsdom document. The symptom is not a cleanup
// warning — it is `getByRole` throwing "found multiple elements" on the second
// and every later test in a file, which reads like a broken component rather
// than a leaking harness. Register it explicitly instead.
afterEach(() => {
  cleanup();
});
