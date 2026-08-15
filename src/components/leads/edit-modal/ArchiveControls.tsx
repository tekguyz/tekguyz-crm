"use client";

import { useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { archiveLead, unarchiveLead } from "@/lib/leads/archive-actions";
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
import type { Lead } from "@/lib/leads/queries";

// The archive/unarchive lifecycle control. Separated cleanly because it lives
// entirely OUTSIDE EditLeadModal's <form> and shares nothing with it — no
// FormData field, no useActionState, no submit path. So its three pieces of
// state and both handlers moved down here with it rather than staying in the
// shell; there is nothing left to prop-thread.
//
// Handlers are verbatim from the pre-split EditLeadModal, including the catch
// blocks added in the Task/Calendar hardening pass — this split moved them,
// it did not touch their logic.
export function ArchiveControls({ lead }: { lead: Lead }) {
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [unarchiving, setUnarchiving] = useState(false);

  async function handleArchiveConfirm(e: MouseEvent<HTMLButtonElement>) {
    // Radix's AlertDialogAction auto-closes on click (it's a styled
    // Dialog.Close) unless the click handler calls preventDefault — needed
    // here so the dialog stays open through the async call and only closes
    // once archiveLead actually resolves, not optimistically on click.
    e.preventDefault();
    setArchiving(true);
    try {
      // A returned {error} is the one expected, explainable failure — a MEMBER
      // blocked by trigger_enforce_lead_role_restrictions. Its message is
      // written for the user, so it is shown verbatim; the dialog stays open,
      // same as the catch path, but retrying will not help so no retry copy.
      const denied = await archiveLead(lead.id);
      if (denied) {
        toast.error(denied.error);
        return;
      }
      toast.success(`${lead.client_name} archived.`);
      setArchiveDialogOpen(false);
    } catch (err) {
      // archiveLead genuinely throws since it was hardened with
      // .select().single() — before that a denied write silently no-op'd and
      // this reported a false success. Deliberately keeps the dialog open
      // (setArchiveDialogOpen is only called on the success path above) so the
      // user can simply retry. Friendly copy rather than the raw PostgREST
      // message, which is unreadable; the real error still reaches the console.
      console.error("[archiveLead]", err);
      toast.error(`Couldn't archive ${lead.client_name} — please try again.`);
    } finally {
      setArchiving(false);
    }
  }

  async function handleUnarchive() {
    setUnarchiving(true);
    try {
      // Same two-channel split as handleArchiveConfirm above.
      const denied = await unarchiveLead(lead.id);
      if (denied) {
        toast.error(denied.error);
        return;
      }
      toast.success(`${lead.client_name} restored from archive.`);
    } catch (err) {
      // Same gap as the archive path above — unarchiveLead has always thrown
      // on error, so this handler could already produce an unhandled rejection.
      console.error("[unarchiveLead]", err);
      toast.error(`Couldn't restore ${lead.client_name} — please try again.`);
    } finally {
      setUnarchiving(false);
    }
  }

  if (lead.archived) {
    return (
      <div className="mt-3 border-t border-hairline pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={unarchiving}
          onClick={handleUnarchive}
          className="-ml-2 text-accent hover:text-accent"
        >
          {unarchiving ? "Restoring…" : "Unarchive lead"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-hairline pt-3">
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        {/* asChild keeps Radix's trigger wiring (ref + focus return) on the
            Button primitive — React 19 passes ref through as a plain prop, so
            Button needs no forwardRef for Slot to reach the real <button>. */}
        <AlertDialogTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="-ml-2">
            Archive lead
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {lead.client_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You can restore this lead later from the Archived filter in Contacts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={archiving} onClick={handleArchiveConfirm}>
              {archiving ? "Archiving…" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
