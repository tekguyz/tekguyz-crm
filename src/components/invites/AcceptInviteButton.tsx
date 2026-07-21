"use client";

import { useActionState } from "react";
import { acceptInvite, type AcceptInviteState } from "@/lib/invites/actions";

const initialState: AcceptInviteState = null;

export function AcceptInviteButton({ token }: { token: string }) {
  const acceptWithToken = acceptInvite.bind(null, token);
  const [state, formAction, isPending] = useActionState(acceptWithToken, initialState);

  return (
    <form action={formAction}>
      {state?.error && (
        <p className="mb-3 rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-accent px-3.5 py-1 text-sm font-medium text-canvas-pure shadow-elevation-1 transition-shadow hover:shadow-elevation-2 disabled:opacity-60"
      >
        {isPending ? "Joining…" : "Accept invite"}
      </button>
    </form>
  );
}
