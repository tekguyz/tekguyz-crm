"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "@/lib/auth/actions";
import {
  IdleTimer,
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS,
} from "@/lib/session/idle-timer";
import { openIdleChannel, type IdleChannel } from "@/lib/session/idle-channel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Signs an inactive user out after IDLE_TIMEOUT_MS, with a warning at
// IDLE_WARNING_MS, synced across every open tab.
//
// WHERE IT LIVES AND WHY. Mounted once in AppShell, which is the only place
// every authenticated route passes through. Per-page would be wrong twice
// over: the clock would restart on navigation, and a page left open in a
// background tab would carry no timer at all.
//
// WHAT IT IS NOT. It never gates a render and it reads no session. The
// server's own answer to "who is this request" is unchanged — see
// § Multi-Tenant Security Model rule 6. This is one client-initiated
// signOut() call and a dialog.

/** How often a raw activity event is allowed to reset the clock. */
const ACTIVITY_SAMPLE_MS = 5000;

/** Activity events worth listening for, all passive. */
const ACTIVITY_EVENTS = [
  "pointerdown",
  "mousemove",
  "keydown",
  "wheel",
  "touchstart",
  "scroll",
] as const;

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function IdleTimeoutController({ isDemo }: { isDemo: boolean }) {
  const [warning, setWarning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(IDLE_TIMEOUT_MS - IDLE_WARNING_MS);

  const timerRef = useRef<IdleTimer | null>(null);
  const channelRef = useRef<IdleChannel | null>(null);
  // Guards the sign-out call itself: the local timeout and a sibling tab's
  // "timeout" message can both land, and signing out twice would race two
  // navigations against each other.
  const leavingRef = useRef(false);
  // Read inside the listener, which is registered once and would otherwise
  // close over the first render's `warning`.
  const warningRef = useRef(false);
  warningRef.current = warning;

  useEffect(() => {
    // The public demo is meant to be always-browsable. The read-only visitor
    // is not a session anyone needs protected, and being thrown back to /login
    // mid-look is a bad first impression of the product. Gated on the same
    // organizations.is_demo flag the header badge uses.
    if (isDemo) return;

    const channel = openIdleChannel((message) => {
      if (message.type === "activity") {
        // Another tab is in use, so this one is not idle either.
        timerRef.current?.activity(message.at);
        setWarning(false);
        return;
      }
      // Another tab already signed the browser out. The auth cookies are
      // shared, so this tab is signed out too — just leave.
      if (!leavingRef.current) {
        leavingRef.current = true;
        window.location.assign("/login");
      }
    });
    channelRef.current = channel;

    const timer = new IdleTimer({
      onWarn: () => setWarning(true),
      onTimeout: () => {
        if (leavingRef.current) return;
        leavingRef.current = true;
        channel.post({ type: "timeout" });
        // The existing server action: one supabase.auth.signOut() and a
        // redirect to /login, so a timed-out user lands on a real page rather
        // than an error boundary.
        void signOut();
      },
    });
    timer.start();
    timerRef.current = timer;

    // Sampled, not raw. mousemove alone fires hundreds of times a second;
    // resetting a stamp that often is pure waste, and posting it to every
    // other tab that often would be worse.
    let lastSample = 0;
    const onActivity = () => {
      // Once the warning is up, passive activity no longer counts. Moving a
      // mouse across the dialog would otherwise reset the clock while leaving
      // the dialog open — a countdown frozen at 2:00 that never expires and
      // never closes. From here the only answers are the two buttons, which is
      // what the dialog is asking for.
      if (warningRef.current) return;
      const now = Date.now();
      if (now - lastSample < ACTIVITY_SAMPLE_MS) return;
      lastSample = now;
      timer.activity(now);
      channel.post({ type: "activity", at: now });
    };

    // Deliberately NOT wired to onActivity: coming back to a tab is not a
    // reason to keep a session alive on its own, or a machine left on an open
    // tab would never time out as the OS focuses and blurs windows. What this
    // does is re-check the clock the moment the tab is looked at again, so a
    // tab that was throttled while hidden settles up immediately instead of
    // waiting for its next tick.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      setRemainingMs(timer.remainingMs());
    };

    for (const type of ACTIVITY_EVENTS) {
      window.addEventListener(type, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      for (const type of ACTIVITY_EVENTS) {
        window.removeEventListener(type, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisible);
      timer.stop();
      channel.close();
      timerRef.current = null;
      channelRef.current = null;
    };
  }, [isDemo]);

  // The countdown inside the dialog. Runs only while the dialog is open, so
  // there is no second per-second interval alive for the other 28 minutes.
  useEffect(() => {
    if (!warning) return;
    const id = setInterval(() => {
      setRemainingMs(timerRef.current?.remainingMs() ?? 0);
    }, 1000);
    setRemainingMs(timerRef.current?.remainingMs() ?? 0);
    return () => clearInterval(id);
  }, [warning]);

  const staySignedIn = useCallback(() => {
    const now = Date.now();
    warningRef.current = false;
    timerRef.current?.activity(now);
    channelRef.current?.post({ type: "activity", at: now });
    setWarning(false);
  }, []);

  const signOutNow = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    channelRef.current?.post({ type: "timeout" });
    void signOut();
  }, []);

  if (isDemo) return null;

  return (
    // Not dismissible by Escape or an outside click: both read as "I saw it",
    // which is exactly the ambiguity this dialog exists to remove. The only
    // ways out are the two buttons.
    <AlertDialog open={warning}>
      <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Still there?</AlertDialogTitle>
          <AlertDialogDescription>
            You have been inactive for a while. We will sign you out in{" "}
            {formatCountdown(remainingMs)} to keep this workspace safe.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={signOutNow}>Sign out now</AlertDialogCancel>
          <AlertDialogAction onClick={staySignedIn}>Stay signed in</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
