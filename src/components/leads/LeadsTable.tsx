// src/components/leads/LeadsTable.tsx
"use client";

import { useMemo, useState } from "react";

import { EditLeadDrawer } from "@/components/leads/EditLeadDrawer";
import { LEAD_COLUMN_IDS, leadColumns } from "@/components/leads/lead-columns";
import { DataTable } from "@/components/ui/DataTable";
import type { Lead } from "@/lib/leads/queries";
import {
  headerSortHref,
  type LeadSortKey,
  type LeadView,
  type ViewPage,
} from "@/lib/views/params";

// The lead table for Contacts and Pipeline (lg and up). The glue between a
// server page and DataTable: a server page can pass the leads and the parsed
// view, but not the cell functions, the sort hrefs or the open handler.
//
// One EditLeadDrawer for the table, keyed by lead, so its form state resets
// between leads (.claude/rules/forms.md). The lead is looked up from the
// current `leads` prop by id, so a save that refreshes the page shows the
// fresh row, not a stale copy.
export function LeadsTable({
  page,
  leads,
  view,
  orgTimezone,
  currencyFormat,
  emptyMessage,
}: {
  page: ViewPage;
  leads: Lead[];
  view: LeadView;
  orgTimezone: string;
  currencyFormat: string;
  emptyMessage: string;
}) {
  const columns = useMemo(() => {
    const all = leadColumns({ orgTimezone, currencyFormat });
    return LEAD_COLUMN_IDS[page].map((id) => all[id]);
  }, [page, orgTimezone, currencyFormat]);

  const [openId, setOpenId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const openLead = openId ? leads.find((lead) => lead.id === openId) : undefined;

  return (
    <>
      <DataTable
        label={page === "contacts" ? "Contacts" : "Open leads"}
        rows={leads}
        columns={columns}
        getRowId={(lead) => lead.id}
        onRowOpen={(lead) => {
          setOpenId(lead.id);
          setOpen(true);
        }}
        // Priority is not a column, so no header shows a sort arrow for it.
        sort={view.sort === "priority" ? null : { key: view.sort, dir: view.dir }}
        sortHref={(key) => headerSortHref(page, view, key as LeadSortKey)}
        emptyMessage={emptyMessage}
      />
      {openLead ? (
        <EditLeadDrawer
          key={openLead.id}
          lead={openLead}
          open={open}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
