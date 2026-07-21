import { revokeInvite } from "@/lib/invites/actions";

export function RevokeInviteButton({ inviteId }: { inviteId: string }) {
  return (
    <form action={revokeInvite.bind(null, inviteId)}>
      <button
        type="submit"
        className="text-xs text-ink-muted underline transition-colors hover:text-ink-main"
      >
        Revoke
      </button>
    </form>
  );
}
