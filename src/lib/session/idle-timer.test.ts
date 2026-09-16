import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { IdleTimer, IDLE_WARNING_MS, IDLE_TIMEOUT_MS } from "@/lib/session/idle-timer";

// Fake timers, not real waiting: the unit under test spans 30 minutes.
// vitest's fake timers also mock Date, so the timer's own Date.now() moves
// with advanceTimersByTime — which is the whole reason the clock comparison
// inside IdleTimer can be exercised at all.
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const MINUTE = 60 * 1000;

function makeTimer() {
  const onWarn = vi.fn();
  const onTimeout = vi.fn();
  const timer = new IdleTimer({ onWarn, onTimeout });
  timer.start();
  return { timer, onWarn, onTimeout };
}

describe("IdleTimer", () => {
  it("warns at 28 minutes of no activity and not before", () => {
    const { onWarn, onTimeout } = makeTimer();

    vi.advanceTimersByTime(IDLE_WARNING_MS - MINUTE);
    expect(onWarn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(MINUTE);
    expect(onWarn).toHaveBeenCalledTimes(1);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("signs out at 30 minutes of no activity", () => {
    const { onTimeout } = makeTimer();

    vi.advanceTimersByTime(IDLE_TIMEOUT_MS - MINUTE);
    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(MINUTE);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("fires the timeout once, even if the clock keeps running", () => {
    const { onTimeout } = makeTimer();

    vi.advanceTimersByTime(IDLE_TIMEOUT_MS + 10 * MINUTE);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("resets the clock on activity, so no warning and no sign-out", () => {
    const { timer, onWarn, onTimeout } = makeTimer();

    // Activity every 20 minutes for two hours — never idle long enough.
    for (let i = 0; i < 6; i++) {
      vi.advanceTimersByTime(20 * MINUTE);
      timer.activity();
    }

    expect(onWarn).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("activity after the warning cancels the sign-out and re-arms the warning", () => {
    const { timer, onWarn, onTimeout } = makeTimer();

    vi.advanceTimersByTime(IDLE_WARNING_MS);
    expect(onWarn).toHaveBeenCalledTimes(1);

    // The "Stay signed in" click.
    timer.activity();

    vi.advanceTimersByTime(IDLE_TIMEOUT_MS - MINUTE);
    expect(onTimeout).not.toHaveBeenCalled();
    // The warning is armed again for the new idle stretch.
    expect(onWarn).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(MINUTE);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("accepts a stamp from another tab and ignores a stale one", () => {
    const { timer, onTimeout } = makeTimer();

    vi.advanceTimersByTime(25 * MINUTE);
    const staleStamp = Date.now() - 20 * MINUTE;

    // Cross-tab activity: the other tab's own stamp, not this tab's clock.
    timer.activity(Date.now());
    // A late-arriving older message must not drag the clock backwards.
    timer.activity(staleStamp);

    vi.advanceTimersByTime(IDLE_TIMEOUT_MS - MINUTE);
    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(MINUTE);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("stops firing once stopped", () => {
    const { timer, onWarn, onTimeout } = makeTimer();

    timer.stop();
    vi.advanceTimersByTime(IDLE_TIMEOUT_MS + MINUTE);

    expect(onWarn).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("reports the time left before sign-out", () => {
    const { timer } = makeTimer();

    vi.advanceTimersByTime(IDLE_WARNING_MS);
    expect(timer.remainingMs()).toBe(2 * MINUTE);

    vi.advanceTimersByTime(10 * MINUTE);
    expect(timer.remainingMs()).toBe(0);
  });
});
