"use client";

import { useActionState, useRef, useState } from "react";

import { useFormResetRestore } from "@/lib/forms/use-form-reset-restore";
import { createInvite, type InviteFormState } from "@/lib/invites/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const initialState: InviteFormState = null;

export function InviteMemberForm() {
  const [state, formAction, isPending] = useActionState(createInvite, initialState);
  // CONTROLLED, not defaultValue. React 19 calls form.reset() after the action
  // returns, failure included — an `Invalid role.` rejection returns { error }
  // without navigating, so the typed email was wiped at exactly the moment the
  // message asked the user to change something. See CLAUDE.md
  // § Form/Action Field Parity.
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  // This group owns a <select>, which React does not restore after the
  // post-action form.reset() — see the hook for why.
  const anchor = useRef<HTMLDivElement>(null);
  useFormResetRestore(anchor);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      {state?.error && (
        <p className="text-body-sm w-full rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
          {state.error}
        </p>
      )}
      <div className="min-w-40 flex-1">
        <Input
          label="Email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div ref={anchor}>
        <Select
          label="Role"
          name="role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
        </Select>
      </div>
      <Button type="submit" variant="primary" loading={isPending}>
        {isPending ? "Inviting…" : "Invite"}
      </Button>
    </form>
  );
}
