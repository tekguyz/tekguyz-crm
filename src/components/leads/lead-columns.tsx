import {
  IconAddressBook,
  IconCalendarDue,
  IconCurrencyDollar,
  IconProgress,
  IconUser,
  IconUserCircle,
} from "@tabler/icons-react";

import { AssigneeLabel } from "@/components/leads/AssigneeLabel";
import { ChannelLinks } from "@/components/leads/ChannelLinks";
import { DueLabel } from "@/components/leads/DueLabel";
import { StageBadge } from "@/components/leads/StageBadge";
import { Avatar } from "@/components/ui/Avatar";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { formatCurrency } from "@/lib/format";
import type { Lead } from "@/lib/leads/queries";
import type { ViewPage } from "@/lib/views/params";

// THE ONE SET of lead column definitions, shared by the Contacts and Pipeline
// tables (#47 step 9). Each column renders the same part the rest of the app
// uses for that field: StageBadge, DueLabel (never a bare date), Avatar,
// AssigneeLabel, ChannelLinks.
//
// No directive: only client components import this (LeadsTable), and a
// server component cannot pass these cell functions across the boundary.

export type LeadColumnId = "name" | "stage" | "amount" | "due" | "channels" | "owner";

export const LEAD_COLUMN_IDS: Record<ViewPage, LeadColumnId[]> = {
  contacts: ["name", "stage", "channels", "owner"],
  pipeline: ["name", "stage", "amount", "due", "owner"],
};

// Owner is not sortable: assigned_to is a uuid and the name is resolved in
// the client (MembersContext), so the server cannot sort by it.
export function leadColumns({
  orgTimezone,
  currencyFormat,
}: {
  orgTimezone: string;
  currencyFormat: string;
}): Record<LeadColumnId, DataTableColumn<Lead, LeadColumnId>> {
  return {
    name: {
      id: "name",
      label: "Name",
      icon: IconUser,
      sortKey: "name",
      opensRow: true,
      minWidth: 200,
      cell: (lead) => (
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={lead.client_name} size="sm" />
          <span className="min-w-0">
            <span className="text-body-md block truncate font-medium">{lead.client_name}</span>
            {lead.company ? (
              <span className="text-body-sm block truncate text-ink-muted">{lead.company}</span>
            ) : null}
          </span>
        </span>
      ),
    },
    stage: {
      id: "stage",
      label: "Stage",
      icon: IconProgress,
      sortKey: "stage",
      minWidth: 110,
      cell: (lead) => <StageBadge status={lead.status} />,
    },
    amount: {
      id: "amount",
      label: "Amount",
      icon: IconCurrencyDollar,
      sortKey: "amount",
      align: "end",
      minWidth: 110,
      cell: (lead) => (
        <span className="text-body-md font-medium tabular-nums">
          {formatCurrency(lead.estimated_revenue, currencyFormat)}
        </span>
      ),
    },
    due: {
      id: "due",
      label: "Next action",
      icon: IconCalendarDue,
      sortKey: "due",
      minWidth: 140,
      cell: (lead) => <DueLabel at={lead.next_action_at} timeZone={orgTimezone} />,
    },
    channels: {
      id: "channels",
      label: "Channels",
      icon: IconAddressBook,
      minWidth: 120,
      cell: (lead) => (
        <div className="flex items-center gap-1">
          <ChannelLinks lead={lead} />
        </div>
      ),
    },
    owner: {
      id: "owner",
      label: "Owner",
      icon: IconUserCircle,
      minWidth: 140,
      cell: (lead) => <AssigneeLabel assignedTo={lead.assigned_to} avatar />,
    },
  };
}
