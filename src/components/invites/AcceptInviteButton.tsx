"use client";

import { useActionState } from "react";
import { acceptInvite, type AcceptInviteState } from "@/lib/invites/actions";
import { Button } from "@/components/ui/Button";

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
      {/* `loading` both disables the control and shows Button's own spinner, so
          the hand-rolled disabled state is gone. The label still swaps — the
          spinner says "busy", the label says what it is busy doing. */}
      <Button type="submit" variant="primary" loading={isPending} className="w-full">
        {isPending ? "Joining…" : "Accept invite"}
      </Button>
    </form>
  );
}
