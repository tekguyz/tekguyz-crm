import { createClient } from "@/lib/supabase/server";
import { LEAD_COLUMNS, type Lead } from "@/lib/leads/queries";

// Row-level CSV export of the leads table. Shares no machinery with the CSV
// IMPORT wizard (lib/import/*) by design — import parses an unknown file and
// maps it onto columns; export serialises the columns this app already agrees
// on. The one thing it must not do is invent that agreement.
//
// The column set IS LEAD_COLUMNS, split on commas, never a hand-written list.
// That single string already backs eight read sites (see CLAUDE.md § Build
// discipline); a ninth, hand-maintained copy is exactly the drift class that
// produced the field-parity bugs — it would go stale silently the next time a
// column is added, and an export missing a column looks like a working export.
export const LEAD_EXPORT_COLUMNS: string[] = LEAD_COLUMNS.split(",").map((c) => c.trim());

// RFC 4180: a field containing a comma, a quote or a newline is wrapped in
// double quotes, and an embedded quote is doubled.
//
// The leading apostrophe on =, +, - and @ is CSV-injection defence, not
// cosmetics: a lead whose client_name a stranger set to `=HYPERLINK(...)`
// through the public webhook becomes a live formula the moment an operator
// opens the file in Excel or Sheets. The values here are attacker-supplied by
// definition, so this is not optional.
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = typeof value === "boolean" ? String(value) : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function leadsToCsv(rows: Lead[]): string {
  const lines = [LEAD_EXPORT_COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(
      LEAD_EXPORT_COLUMNS.map((column) =>
        escapeCsvValue((row as unknown as Record<string, unknown>)[column]),
      ).join(","),
    );
  }
  // CRLF, the RFC 4180 line ending — Excel on Windows is the realistic
  // consumer here and a bare LF makes it render the whole file as one row.
  return `${lines.join("\r\n")}\r\n`;
}

// Read-only. Scoped by organization_id on top of RLS, the same belt-and-braces
// as every other lead query — RLS is the actual tenant boundary, this makes
// the intent explicit and survives a future policy edit.
//
// Archived rows are included: an export is an archive, not a working view, and
// silently dropping the leads a user removed would make the file wrong for the
// one purpose people export for (a backup or a migration). No `archived`
// filter is applied in either direction; the column itself is in the file, so
// the reader can filter.
export async function getLeadsForExport(orgId: string): Promise<Lead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("organization_id", orgId)
    .order("client_name", { ascending: true });

  if (error) throw error;
  return data;
}

// Stable prefix + a date, so repeated exports sort together in a downloads
// folder instead of overwriting each other.
export function leadsCsvFilename(orgName: string, now: Date = new Date()): string {
  const slug =
    orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "organization";
  return `${slug}-leads-${now.toISOString().slice(0, 10)}.csv`;
}
