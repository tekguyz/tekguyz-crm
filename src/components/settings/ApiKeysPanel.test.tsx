import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/credentials-actions", () => ({
  getCredentialStatus: vi.fn(async () => ({ hasGeminiKey: false, hasAnthropicKey: false })),
  saveOrganizationCredentials: vi.fn(),
  clearOrganizationCredential: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
// HelpTooltip needs a HelpProvider from the app shell; it is not part of what
// this suite is asserting, so it is stubbed rather than wrapped.
vi.mock("@/components/help/HelpTooltip", () => ({ HelpTooltip: () => null }));

const { ApiKeysPanel } = await import("./ApiKeysPanel");

const geminiLabel = "Gemini API key";
const anthropicLabel = "Anthropic API key";

describe("ApiKeysPanel — surviving a failed submit", () => {
  // Regression (2026-08-26). React 19 calls form.reset() after the action
  // returns, failure included — e.g. saveOrganizationCredentials rejecting a
  // malformed key. Losing a pasted API key is the most expensive instance of
  // this bug in the app: the value is long, opaque, and usually not retypable
  // from memory.
  it("keeps both pasted keys when the form is reset", async () => {
    const user = userEvent.setup();
    const { container } = render(<ApiKeysPanel canEdit />);
    await waitFor(() => screen.getByLabelText(geminiLabel));

    await user.type(screen.getByLabelText(geminiLabel), "AIza-fake-gemini-key");
    await user.type(screen.getByLabelText(anthropicLabel), "sk-ant-fake-key");

    // React 19's real sequence is form.reset() — and NOT necessarily a
    // re-render, since the component's props have not changed. Calling
    // rerender() here would mask the bug this pins: a controlled <select> is
    // restored by neither, so the group has to re-assert itself. Proven in the
    // browser, where React's props read the new value while the DOM read the
    // old one.
    container.querySelector("form")!.reset();

    await waitFor(() => {
      expect(screen.getByLabelText(geminiLabel)).toHaveValue("AIza-fake-gemini-key");
    });
    expect(screen.getByLabelText(anthropicLabel)).toHaveValue("sk-ant-fake-key");
  });

  it("keeps a pasted key across a re-render", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ApiKeysPanel canEdit />);
    await waitFor(() => screen.getByLabelText(geminiLabel));

    await user.type(screen.getByLabelText(geminiLabel), "AIza-fake-gemini-key");
    rerender(<ApiKeysPanel canEdit />);

    expect(screen.getByLabelText(geminiLabel)).toHaveValue("AIza-fake-gemini-key");
  });

  it("starts both fields blank — a stored key is never shown back", async () => {
    render(<ApiKeysPanel canEdit />);
    await waitFor(() => screen.getByLabelText(geminiLabel));

    expect(screen.getByLabelText(geminiLabel)).toHaveValue("");
    expect(screen.getByLabelText(anthropicLabel)).toHaveValue("");
  });

  it("posts exactly the two fields saveOrganizationCredentials reads", async () => {
    const { container } = render(<ApiKeysPanel canEdit />);
    await waitFor(() => screen.getByLabelText(geminiLabel));

    expect([...new FormData(container.querySelector("form")!).keys()].sort()).toEqual([
      "api_key_anthropic",
      "api_key_gemini",
    ]);
  });

  it("renders no form at all for a MEMBER", () => {
    const { container } = render(<ApiKeysPanel canEdit={false} />);
    expect(container.querySelector("form")).toBeNull();
  });
});
