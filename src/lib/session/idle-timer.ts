// The idle-timeout clock, with no DOM and no React in it.
//
// WHY A POLLING TICK AND NOT TWO setTimeout CALLS.
// A laptop lid closing, or a background tab being throttled by Chromium, both
// stall a pending setTimeout — so a timer built on two scheduled callbacks
// reports "still active" after a machine sleeps through the whole threshold,
// which is the exact case this feature exists for. Comparing a stored
// last-activity stamp against the clock on a short tick is immune to that: a
// tab that wakes up 90 minutes late sees 90 minutes of idleness on its next
// tick and signs out, no matter how many ticks it missed.
//
// WHY IT IS A PLAIN CLASS.
// It is the whole unit under test. Everything a browser supplies — pointer
// listeners, BroadcastChannel, the warning dialog, the sign-out call — lives in
// IdleTimeoutController.tsx and reaches this object through activity() and the
// two callbacks. That is what lets the suite drive 30 minutes with fake timers
// in the `node` project, with no jsdom at all.

/** Warn the user here. 28 minutes. */
export const IDLE_WARNING_MS = 28 * 60 * 1000;

/** Sign the user out here. 30 minutes. */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * How often the clock is checked. 5s is well under the 2-minute gap between
 * the warning and the sign-out, so the warning is never skipped, and it is a
 * bare timestamp comparison — cheap enough to run forever.
 */
export const IDLE_TICK_MS = 5 * 1000;

export type IdleTimerOptions = {
  onWarn: () => void;
  onTimeout: () => void;
  warningMs?: number;
  timeoutMs?: number;
  tickMs?: number;
  /** Injectable clock. Defaults to Date.now. */
  now?: () => number;
};

export class IdleTimer {
  private readonly onWarn: () => void;
  private readonly onTimeout: () => void;
  private readonly warningMs: number;
  private readonly timeoutMs: number;
  private readonly tickMs: number;
  private readonly now: () => number;

  private lastActivityAt = 0;
  private warned = false;
  private timedOut = false;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(options: IdleTimerOptions) {
    this.onWarn = options.onWarn;
    this.onTimeout = options.onTimeout;
    this.warningMs = options.warningMs ?? IDLE_WARNING_MS;
    this.timeoutMs = options.timeoutMs ?? IDLE_TIMEOUT_MS;
    this.tickMs = options.tickMs ?? IDLE_TICK_MS;
    this.now = options.now ?? (() => Date.now());
  }

  start() {
    if (this.interval !== null) return;
    this.lastActivityAt = this.now();
    this.interval = setInterval(() => this.tick(), this.tickMs);
  }

  stop() {
    if (this.interval === null) return;
    clearInterval(this.interval);
    this.interval = null;
  }

  /**
   * Record activity. `at` exists so a BroadcastChannel message from another
   * tab can carry that tab's stamp rather than this tab's — otherwise a
   * message delayed in transit would read as newer than it is.
   *
   * An older stamp is ignored rather than applied: messages from several tabs
   * can arrive out of order, and the newest activity is the one that counts.
   */
  activity(at: number = this.now()) {
    if (this.timedOut) return;
    if (at <= this.lastActivityAt) return;
    this.lastActivityAt = at;
    this.warned = false;
  }

  /** Milliseconds of inactivity right now. */
  idleFor(): number {
    return this.now() - this.lastActivityAt;
  }

  /** Milliseconds left before sign-out. Never negative. */
  remainingMs(): number {
    return Math.max(0, this.timeoutMs - this.idleFor());
  }

  private tick() {
    if (this.timedOut) return;
    const idle = this.idleFor();

    if (idle >= this.timeoutMs) {
      // Latched, and the clock is stopped, so a slow sign-out call can never
      // be fired twice by the next tick.
      this.timedOut = true;
      this.stop();
      this.onTimeout();
      return;
    }

    if (idle >= this.warningMs && !this.warned) {
      this.warned = true;
      this.onWarn();
    }
  }
}
