"use client";

import { useEffect, useReducer, useRef, type RefObject } from "react";

// React 19 resets a <form action={...}> after the action returns, failure
// included, by calling form.reset() on the element. That is the whole reason
// the fields in these forms are controlled — but controlling them is only half
// the fix, and the missing half is invisible in a unit test that re-renders.
//
// What actually happens after the reset:
//
//  - a controlled <input> is restored by React itself, synchronously;
//  - a controlled <select> is NOT. form.reset() moves the DOM selection behind
//    React's back, React's state is unchanged, so nothing re-renders and
//    nothing writes the value back. Proven in the browser on 2026-08-26: after
//    a real unique_tenant_client_email_ci failure the Outcome select's React
//    props still read "WON" while the DOM element read "" — state correct,
//    display and next submission both wrong;
//  - a Radix Checkbox is actively dragged back: it registers its own "reset"
//    listener and calls setChecked(<value at mount>), which for a controlled
//    checkbox fires onCheckedChange with the OLD value. Verified against
//    @radix-ui/react-checkbox 1.3.11.
//
// So a group that owns a <select> or a Checkbox has to re-assert itself after a
// reset. This forces exactly one re-render, which is enough: React's select
// commit path rewrites the selection from props on every update.
//
// Two details are load-bearing:
//
//  - the work runs in a microtask, so it lands after EVERY reset listener
//    regardless of registration order — the one thing that must not depend on
//    Radix's internals staying as they are;
//  - the form is found by walking up from `anchor` rather than being passed in,
//    because a field group is often a sibling component that does not own the
//    <form> element. EditLeadDrawer's form is split across five such files.
//
// `restore` is optional and is for state a reset can corrupt (a Checkbox's).
// A plain <select> needs no callback — the re-render alone fixes it.
export function useFormResetRestore(
  anchor: RefObject<HTMLElement | null>,
  restore?: () => void,
) {
  const [, forceRender] = useReducer((n: number) => n + 1, 0);
  const latest = useRef(restore);
  latest.current = restore;

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;
    const handler = () =>
      queueMicrotask(() => {
        latest.current?.();
        forceRender();
      });
    form.addEventListener("reset", handler);
    return () => form.removeEventListener("reset", handler);
  }, [anchor]);
}
