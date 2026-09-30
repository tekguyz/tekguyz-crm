"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { startDemo, type StartDemoState } from "@/lib/demo/start-demo";

// "Try the demo" — the demo's only door (src/lib/demo/start-demo.ts).
//
// A form's submit button, never a link: only a press may make a Guest, so no
// preview, prefetch or crawler ever can. On success the action redirects into
// the app; the only thing that comes back here is the busy or failed message.
export function TryDemoButton({ className }: { className?: string }) {
  const [state, formAction, isPending] = useActionState<StartDemoState, FormData>(startDemo, null);

  return (
    <form action={formAction} className={className}>
      <Button type="submit" variant="secondary" loading={isPending}>
        Try the demo
      </Button>
      {state?.error ? (
        <p role="alert" className="text-body-sm mt-2 text-ink-muted">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
