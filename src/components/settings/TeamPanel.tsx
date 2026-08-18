import { getTeamMembers, getOpenInvites } from "@/lib/invites/queries";
import { InviteMemberForm } from "@/components/settings/InviteMemberForm";
import { CopyInviteLinkButton } from "@/components/settings/CopyInviteLinkButton";
import { RevokeInviteButton } from "@/components/settings/RevokeInviteButton";
import { MemberRow } from "@/components/settings/MemberRow";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export async function TeamPanel({
  orgId,
  canManage,
  currentUserId,
  currentUserRole,
}: {
  orgId: string;
  canManage: boolean;
  // Both resolved by getCurrentOrg() in the settings page. MemberRow needs them
  // to mark your own row and to offer "Leave" instead of "Remove" on it — the
  // database is still what decides whether either is permitted.
  currentUserId: string;
  currentUserRole: string;
}) {
  const [members, { pending, expired }] = await Promise.all([
    getTeamMembers(orgId),
    getOpenInvites(orgId),
  ]);

  return (
    <Card className="p-6">
      <h2 className="text-h2 mb-4">Team</h2>

      <div className="mb-6 space-y-2">
        {members.map((member) => (
          <MemberRow
            key={member.user_id}
            member={member}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        ))}
      </div>

      {pending.length > 0 && (
        <div className="mb-6 space-y-2 border-t border-hairline pt-4">
          <h3 className="text-label text-ink-muted">Pending invites</h3>
          {pending.map((invite) => (
            <div
              key={invite.id}
              className="text-body-md flex items-center justify-between gap-2"
            >
              <div>
                <span className="text-ink-main">{invite.email}</span>
                <span className="text-label ml-2 text-ink-muted">{invite.role}</span>
              </div>
              {/* The invite link carries a capability token — never rendered
                  (and therefore never sent to the client) for non-managers. */}
              {canManage && (
                <div className="flex items-center gap-2">
                  <CopyInviteLinkButton token={invite.token} />
                  <RevokeInviteButton inviteId={invite.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Expired invites are shown, not hidden: the row still occupies
          `unique_pending_invite_per_org_email`, so it keeps blocking a fresh
          invite to that address until someone revokes it. */}
      {expired.length > 0 && (
        <div className="mb-6 space-y-2 border-t border-hairline pt-4">
          <h3 className="text-label text-ink-muted">Expired invites</h3>
          <p className="text-caption text-ink-muted">
            These invites can no longer be accepted, and they block a new invite
            to the same address. Revoke one to free up its email address.
          </p>
          {expired.map((invite) => (
            <div
              key={invite.id}
              className="text-body-md flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-ink-main">{invite.email}</span>
                <span className="text-label text-ink-muted">{invite.role}</span>
                {/* `neutral`, not `cold` — Badge's cold tone is the Going Cold
                    SLA signal and is never repurposed for styling. */}
                <Badge tone="neutral">Expired</Badge>
              </div>
              {canManage && <RevokeInviteButton inviteId={invite.id} />}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className="border-t border-hairline pt-4">
          <InviteMemberForm />
        </div>
      )}
    </Card>
  );
}
