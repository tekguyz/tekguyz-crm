import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { IdleTimeoutController } from "@/components/shell/IdleTimeoutController";
import { IDLE_WARNING_MS, IDLE_TIMEOUT_MS } from "@/lib/session/idle-timer";

// The Server Action is the one thing this component reaches outside itself.
// Mocked, because the real one redirects and talks to Supabase.
const signOutMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/actions", () => ({ signOut: signOutMock }));

// jsdom ships no BroadcastChannel. A tiny in-memory one, shared by every
// instance of the same name, lets the cross-tab path be driven for real —
// two mounted controllers stand in for two tabs.
const channels = new Set<FakeBroadcastChannel>();

class FakeBroadcastChannel {
  onmessage: ((event: MessageEvent) => void) | null = null;
  constructor(readonly name: string) {
    channels.add(this);
  }
  postMessage(data: unknown) {
    for (const other of channels) {
      // A real BroadcastChannel never delivers to its own sender.
      if (other !== this && other.name === this.name) {
        other.onmessage?.({ data } as MessageEvent);
      }
    }
  }
  close() {
    channels.delete(this);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  signOutMock.mockReset();
  channels.clear();
  vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("IdleTimeoutController", () => {
  it("shows the warning dialog at 28 minutes and signs out at 30", () => {
    render(<IdleTimeoutController isDemo={false} />);

    advance(IDLE_WARNING_MS - 1000);
    expect(screen.queryByText("Still there?")).not.toBeInTheDocument();

    advance(1000);
    expect(screen.getByText("Still there?")).toBeInTheDocument();
    expect(signOutMock).not.toHaveBeenCalled();

    advance(IDLE_TIMEOUT_MS - IDLE_WARNING_MS);
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the session when real activity happens before the warning", () => {
    render(<IdleTimeoutController isDemo={false} />);

    // A keystroke every 20 minutes, for an hour.
    for (let i = 0; i < 3; i++) {
      advance(20 * 60 * 1000);
      act(() => {
        fireEvent.keyDown(window, { key: "a" });
      });
    }

    expect(screen.queryByText("Still there?")).not.toBeInTheDocument();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("'Stay signed in' closes the dialog and restarts the clock", () => {
    render(<IdleTimeoutController isDemo={false} />);

    advance(IDLE_WARNING_MS);
    fireEvent.click(screen.getByRole("button", { name: "Stay signed in" }));

    expect(screen.queryByText("Still there?")).not.toBeInTheDocument();

    advance(IDLE_TIMEOUT_MS - 60_000);
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("'Sign out now' signs out immediately", () => {
    render(<IdleTimeoutController isDemo={false} />);

    advance(IDLE_WARNING_MS);
    fireEvent.click(screen.getByRole("button", { name: "Sign out now" }));

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it("activity in another tab keeps this one alive", () => {
    render(<IdleTimeoutController isDemo={false} />);
    // A separate channel member stands in for the other tab. It is NOT a
    // mounted controller on purpose: a second controller would hear the same
    // window keydown directly, so the assertion would pass without the channel
    // carrying anything.
    const otherTab = new FakeBroadcastChannel("tekguyz-idle");

    advance(27 * 60 * 1000);
    act(() => {
      otherTab.postMessage({ type: "activity", at: Date.now() });
    });

    // Without the cross-tab reset this tab would have warned a minute ago.
    advance(27 * 60 * 1000);
    expect(screen.queryByText("Still there?")).not.toBeInTheDocument();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("leaves for /login when another tab reports a timeout", () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });

    render(<IdleTimeoutController isDemo={false} />);
    const otherTab = new FakeBroadcastChannel("tekguyz-idle");

    act(() => {
      otherTab.postMessage({ type: "timeout" });
    });

    expect(assign).toHaveBeenCalledWith("/login");
  });

  it("ignores passive activity once the warning is up", () => {
    render(<IdleTimeoutController isDemo={false} />);

    advance(IDLE_WARNING_MS);
    expect(screen.getByText("Still there?")).toBeInTheDocument();

    // A mouse crossing the dialog is not an answer. Without this rule the
    // clock would reset and the dialog would sit at 2:00 forever.
    act(() => {
      fireEvent.mouseMove(window);
    });
    advance(IDLE_TIMEOUT_MS - IDLE_WARNING_MS);

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it("does nothing at all for the read-only demo visitor", () => {
    render(<IdleTimeoutController isDemo />);

    advance(IDLE_TIMEOUT_MS + 60_000);

    expect(screen.queryByText("Still there?")).not.toBeInTheDocument();
    expect(signOutMock).not.toHaveBeenCalled();
  });
});
