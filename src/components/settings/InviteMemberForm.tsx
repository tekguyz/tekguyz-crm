"use client";

import { useActionState } from "react";
import { createInvite, type InviteFormState } from "@/lib/invites/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const initialState: InviteFormState = null;

export function InviteMemberForm() {
  const [state, formAction, isPending] = useActionState(createInvite, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      {state?.error && (
        <p className="text-body-sm w-full rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
          {state.error}
        </p>
      )}
      <div className="min-w-40 flex-1">
        <Input label="Email" name="email" type="email" required />
      </div>
      <div>
        <Select label="Role" name="role" defaultValue="MEMBER">
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
