import { revokeInvite } from "@/lib/invites/actions";

import { Button } from "@/components/ui/Button";

export function RevokeInviteButton({ inviteId }: { inviteId: string }) {
  return (
    <form action={revokeInvite.bind(null, inviteId)}>
      <Button type="submit" variant="ghost" size="sm">
        Revoke
      </Button>
    </form>
  );
}
