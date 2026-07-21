"use client";

import { useActionState } from "react";
import { createInvite, type InviteFormState } from "@/lib/invites/actions";

const initialState: InviteFormState = null;

export function InviteMemberForm() {
  const [state, formAction, isPending] = useActionState(createInvite, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      {state?.error && (
        <p className="w-full rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
          {state.error}
        </p>
      )}
      <div className="min-w-40 flex-1">
        <label className="mb-1 block text-xs text-ink-muted">Email</label>
        <input
          name="email"
          type="email"
          required
          className="w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-muted">Role</label>
        <select
          name="role"
          defaultValue="MEMBER"
          className="rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none"
        >
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-accent px-3.5 py-1 text-sm font-medium text-canvas-pure shadow-elevation-1 transition-shadow hover:shadow-elevation-2 disabled:opacity-60"
      >
        {isPending ? "Inviting…" : "Invite"}
      </button>
    </form>
  );
}
