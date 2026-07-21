import { getTeamMembers, getPendingInvites } from "@/lib/invites/queries";
import { InviteMemberForm } from "@/components/settings/InviteMemberForm";
import { CopyInviteLinkButton } from "@/components/settings/CopyInviteLinkButton";
import { RevokeInviteButton } from "@/components/settings/RevokeInviteButton";

export async function TeamPanel({
  orgId,
  canManage,
}: {
  orgId: string;
  canManage: boolean;
}) {
  const [members, invites] = await Promise.all([
    getTeamMembers(orgId),
    getPendingInvites(orgId),
  ]);

  return (
    <section className="rounded-lg border border-hairline bg-canvas-pure p-6 shadow-elevation-1">
      <h2 className="mb-4 text-base font-semibold">Team</h2>

      <div className="mb-6 space-y-2">
        {members.map((member) => (
          <div key={member.user_id} className="flex items-center justify-between text-sm">
            <span className="text-ink-main">{member.email}</span>
            <span className="text-xs text-ink-muted">{member.role}</span>
          </div>
        ))}
      </div>

      {invites.length > 0 && (
        <div className="mb-6 space-y-2 border-t border-hairline pt-4">
          <h3 className="text-xs font-medium text-ink-muted">Pending invites</h3>
          {invites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between gap-2 text-sm">
              <div>
                <span className="text-ink-main">{invite.email}</span>
                <span className="ml-2 text-xs text-ink-muted">{invite.role}</span>
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

      {canManage && (
        <div className="border-t border-hairline pt-4">
          <InviteMemberForm />
        </div>
      )}
    </section>
  );
}
