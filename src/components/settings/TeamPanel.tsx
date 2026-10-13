import { getTeamMembers, getOpenInvites } from "@/lib/invites/queries";
import { InviteMemberForm } from "@/components/settings/InviteMemberForm";
import { CopyInviteLinkButton } from "@/components/settings/CopyInviteLinkButton";
import { RevokeInviteButton } from "@/components/settings/RevokeInviteButton";
import { MemberRow } from "@/components/settings/MemberRow";
import { RoleBadge } from "@/components/settings/RoleBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import type { ReactNode } from "react";

function GroupHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 bg-canvas-soft px-3 py-1.5">
      <h3 className="text-label text-ink-muted">{title}</h3>
      <span className="text-label ml-auto text-ink-muted tabular-nums">{count}</span>
    </div>
  );
}

function InviteRow({
  email,
  role,
  expired = false,
  children,
}: {
  email: string;
  role: string;
  expired?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="text-body-md flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2.5 max-sm:min-h-11">
      <span className="flex min-w-0 items-center gap-2.5">
        <Avatar name={email.split("@")[0].replace(/[._-]+/g, " ")} />
        <span className="truncate text-ink-main">{email}</span>
        <RoleBadge role={role} />
        {/* An expired invite is a warning, not the Going Cold signal, so it is
            orange rather than the neutral it wore before. */}
        {expired && <Badge tone="orange">Expired</Badge>}
      </span>
      {children ? <div className="ml-auto flex items-center gap-2">{children}</div> : null}
    </div>
  );
}

// No Card and no heading of its own — the settings page's SettingsSection
// supplies both. See OrgDetailsPanel.
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
    <div>
      {/* ONE list = ONE panel with row dividers: members first, then the open
          invites as their own labelled groups, each header carrying its count.
          divide-y runs across every direct child, header and row alike. */}
      <div className="mb-5 divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
        <GroupHeader title="Members" count={members.length} />
        {members.map((member) => (
          <MemberRow
            key={member.user_id}
            member={member}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        ))}

        {pending.length > 0 && <GroupHeader title="Pending invites" count={pending.length} />}
        {pending.map((invite) => (
          <InviteRow key={invite.id} email={invite.email} role={invite.role}>
            {/* The invite link carries a capability token — never rendered
                (and therefore never sent to the client) for non-managers. */}
            {canManage && (
              <>
                <CopyInviteLinkButton token={invite.token} />
                <RevokeInviteButton inviteId={invite.id} />
              </>
            )}
          </InviteRow>
        ))}

        {/* Expired invites are shown, not hidden: the row still occupies
            `unique_pending_invite_per_org_email`, so it keeps blocking a fresh
            invite to that address until someone revokes it. */}
        {expired.length > 0 && <GroupHeader title="Expired invites" count={expired.length} />}
        {expired.length > 0 && (
          <p className="text-caption px-3 py-2 text-ink-muted">
            These invites can no longer be accepted, and they block a new invite
            to the same address. Revoke one to free up its email address.
          </p>
        )}
        {expired.map((invite) => (
          <InviteRow key={invite.id} email={invite.email} role={invite.role} expired>
            {canManage && <RevokeInviteButton inviteId={invite.id} />}
          </InviteRow>
        ))}
      </div>

      {canManage && (
        <div className="border-t border-hairline pt-4">
          <InviteMemberForm />
        </div>
      )}
    </div>
  );
}
