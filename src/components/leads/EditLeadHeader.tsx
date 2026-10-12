"use client";

import { useEffect, useState } from "react";

import type { Lead } from "@/lib/leads/queries";
import { fetchOrgDisplaySettings } from "@/lib/organizations/actions";
import { DueLabel } from "@/components/leads/DueLabel";
import { StageBadge } from "@/components/leads/StageBadge";
import { Avatar } from "@/components/ui/Avatar";
import { SheetTitle } from "@/components/ui/sheet";

// Who the edit drawer is about: the same avatar, stage pill and due label the
// read panel's header carries, so switching between the two views does not
// change what the operator knows about the lead. Editing "Follow-up due"
// without being able to see that the lead is already 3d overdue was the gap.
//
// Its own component, rendered inside the SheetContent, so the display-settings
// fetch runs when the drawer opens and not once for a drawer that is shut.
// A failed fetch leaves the UTC default, a formatting difference and not a
// missing fact, the same call LeadProfilePanel makes.
export function EditLeadHeader({ lead }: { lead: Lead }) {
  const [timeZone, setTimeZone] = useState("UTC");

  useEffect(() => {
    let cancelled = false;
    fetchOrgDisplaySettings()
      .then((settings) => {
        if (!cancelled) setTimeZone(settings.timeZone);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Avatar name={lead.client_name} size="lg" />
      <div className="min-w-0 flex-1">
        <SheetTitle className="text-title truncate">{lead.client_name}</SheetTitle>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <StageBadge status={lead.status} />
          <DueLabel at={lead.next_action_at} timeZone={timeZone} />
        </div>
      </div>
    </>
  );
}
