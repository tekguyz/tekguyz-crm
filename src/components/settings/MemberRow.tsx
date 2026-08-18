"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { changeMemberRole, removeMember } from "@/lib/organizations/team-actions";
import { canManageTeam } from "@/lib/organizations/roles";
import type { TeamMember } from "@/lib/invites/queries";

// One row of the Team panel: who they are, what role they hold, and the two
// controls that can change either.
//
// Nothing here is a security boundary. change_member_role and
// remove_organization_member each re-resolve the caller's own role for the org
// inside the function body, and both refuse a request this component would
// never have offered. What this decides is only what is worth OFFERING —
// same standing as canEditLeadLifecycle in ArchiveControls.
//
// Two rules the database enforces are deliberately NOT mirrored as disabled
// controls: "an admin cannot touch an owner" and "the last owner cannot be
// demoted or removed". Both are cheap to check here and both were left out. A
// disabled control with no explanation reads as "yours, later"; the refusal
// carries the reason, and the reason is the useful part. The one exception is
// the row-is-you case below, where the control genuinely changes meaning.
export function MemberRow({
  member,
  currentUserId,
  currentUserRole,
}: {
  member: TeamMember;
  currentUserId: string;
  currentUserRole: string;
}) {
  const router = useRouter();
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [pendingRole, startRoleTransition] = useTransition();

  // CONTROLLED, and that is the whole point — this was an uncontrolled
  // defaultValue first and it shipped a lie. On a refusal (demoting the last
  // owner is the everyday case) the <select> keeps showing whatever the user
  // picked, because defaultValue only applies at mount: React reconciles the
  // same element on re-render, so neither a server re-render nor
  // router.refresh() can put the old value back. The panel then claimed this
  // person was a Member while the database still had them as Owner — the same
  // "the data does not match what the user saw" class as the silent-NULL-on-
  // save bug. Caught in the browser, not by any test.
  const [role, setRole] = useState(member.role);

  const isSelf = member.user_id === currentUserId;
  const canManage = canManageTeam(currentUserRole);

  function handleRoleChange(newRole: string) {
    // Compared against local state, not against member.role: after a
    // successful change the server value catches up only once revalidatePath
    // lands, so member.role is briefly stale and would let a redundant call
    // through.
    if (newRole === role) return;

    const previousRole = role;
    setRole(newRole); // optimistic, so the control responds immediately

    startRoleTransition(async () => {
      // No try/catch: changeMemberRole returns its failures rather than
      // throwing, because every expected one is an enumerated database rule.
      const result = await changeMemberRole(member.user_id, newRole);
      if (result?.error) {
        setRole(previousRole); // the actual fix — put back what the DB still holds
        toast.error(result.error);
        return;
      }
      toast.success(`${member.email} is now ${ROLE_LABELS[newRole] ?? newRole}.`);
      // Pulls the rest of the panel back in line with the new role — your own
      // row losing OWNER changes which controls you are offered.
      router.refresh();
    });
  }

  async function handleRemoveConfirm(e: MouseEvent<HTMLButtonElement>) {
    // Radix's AlertDialogAction is a styled Dialog.Close and auto-closes on
    // click unless prevented — needed so the dialog survives the await and
    // closes only once the call has actually resolved. Same recipe as
    // ArchiveControls.
    e.preventDefault();
    setRemoving(true);
    try {
      const result = await removeMember(member.user_id);
      if (result?.error) {
        // Dialog stays open on purpose: the last-owner refusal tells the user
        // what to do first, and they may want to read it against the list.
        toast.error(result.error);
        return;
      }

      setRemoveOpen(false);

      if (result?.leftOrganization) {
        // You just removed your own access. getCurrentOrg() will now find no
        // membership and redirect to /onboarding by itself; this only has to
        // leave /settings, which no longer exists for this user.
        toast.success("You have left the organization.");
        router.replace("/");
        return;
      }

      toast.success(`${member.email} was removed from the organization.`);
    } catch (err) {
      // removeMember returns errors rather than throwing, so reaching here
      // means the action itself failed — a network drop or a server error.
      // Friendly copy; the real error goes to the console.
      console.error("[removeMember]", err);
      toast.error("Couldn't complete that — please try again.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="text-body-md flex flex-wrap items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-ink-main">{member.email}</span>
        {/* `neutral`, not `cold` — Badge's cold tone is the Going Cold SLA
            signal and is never repurposed for styling. */}
        {isSelf && <Badge tone="neutral">You</Badge>}
      </span>

      <div className="flex items-center gap-2">
        {canManage ? (
          <Select
            aria-label={`Role for ${member.email}`}
            value={role}
            disabled={pendingRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="w-32"
          >
            <option value="OWNER">Owner</option>
            <option value="ADMIN">Admin</option>
            <option value="MEMBER">Member</option>
          </Select>
        ) : (
          <span className="text-label text-ink-muted">{member.role}</span>
        )}

        {/* Shown when you can manage the team, and additionally on your own row
            whatever your role — leaving is not a management action, and a
            MEMBER who cannot manage anybody can still choose to leave. */}
        {(canManage || isSelf) && (
          <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="sm">
                {isSelf ? "Leave" : "Remove"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isSelf ? "Leave this organization?" : `Remove ${member.email}?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {isSelf
                    ? "You will lose access to this organization immediately, including every lead and task in it. Only an owner or admin can invite you back. Any leads assigned to you become unassigned."
                    : "They lose access immediately, and any leads assigned to them become unassigned. This is not archiving — the membership is deleted. You can invite them again afterwards."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction disabled={removing} onClick={handleRemoveConfirm}>
                  {removing ? "Working…" : isSelf ? "Leave" : "Remove"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "an owner",
  ADMIN: "an admin",
  MEMBER: "a member",
};
