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

// jsdom ships no ResizeObserver. Radix needs one for the hidden native
// <input type="checkbox"> it keeps inside a form (@radix-ui/react-use-size),
// which is exactly the element that carries a Checkbox's name into FormData —
// so without this stub the Form/Action field-parity tests cannot run at all.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
