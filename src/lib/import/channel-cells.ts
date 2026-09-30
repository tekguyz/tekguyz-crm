import { z } from "zod";

// The junk-cell rule for CSV import (#37). A Lead Pack cell that should hold
// a link but holds something else ("N/A", a handle, a link to the wrong site)
// never stops a lead: the cell is emptied and the row gets a warning. The row
// is refused only if that leaves it with no Contact Channel at all, and that
// check lives in the schema, not here.
//
// This only says whether a cell is the right KIND of value. It does not clean
// or compare links: that is the database's job, in the lead_key_* functions of
// 20260930120000_muse_lead_pack.sql. Two rules in two languages would drift.
//
// Email is held to the same rule: an "N/A" email must not refuse a lead that
// has a phone, because email is optional everywhere except the webhook.

const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

// The host of a link, lower case, without a leading www., m., web. or mbasic.
// A value with a space in it is never a link.
function hostOf(value: string): string | null {
  const trimmed = value.trim();
  if (/\s/.test(trimmed)) return null;
  const host = trimmed.replace(SCHEME, "").split(/[/?#]/, 1)[0].toLowerCase();
  const bare = host.replace(/^(www|m|web|mbasic)\./, "");
  return /^[^.:@]+(\.[^.:@]+)+(:\d+)?$/.test(bare) ? bare : null;
}

const isEmail = (value: string) => z.email().safeParse(value.trim()).success;

const CHANNEL_CELLS: { field: string; label: string; accepts: (value: string) => boolean }[] = [
  { field: "email", label: "an email address", accepts: isEmail },
  { field: "website", label: "a web address", accepts: (value) => hostOf(value) !== null },
  {
    field: "social_facebook",
    label: "a Facebook link",
    accepts: (value) => ["facebook.com", "fb.com", "fb.me"].includes(hostOf(value) ?? ""),
  },
  {
    field: "social_instagram",
    label: "an Instagram link",
    accepts: (value) => ["instagram.com", "instagr.am"].includes(hostOf(value) ?? ""),
  },
  {
    field: "social_whatsapp",
    label: "a WhatsApp link",
    accepts: (value) => /^(wa\.me|(api\.)?whatsapp\.com)$/.test(hostOf(value) ?? ""),
  },
  {
    field: "social_google_business",
    label: "a Google link",
    accepts: (value) =>
      /(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$|(^|\.)goo\.gl$|^g\.page$/.test(hostOf(value) ?? ""),
  },
];

export function clearJunkChannelCells<Row extends Record<string, unknown>>(
  row: Row,
): { row: Row; warnings: string[] } {
  const cleaned: Record<string, unknown> = { ...row };
  const warnings: string[] = [];

  for (const { field, label, accepts } of CHANNEL_CELLS) {
    const value = row[field];
    if (typeof value !== "string" || value.trim() === "" || accepts(value)) continue;
    cleaned[field] = "";
    warnings.push(`"${value.trim()}" is not ${label}, so it was left empty.`);
  }

  return { row: cleaned as Row, warnings };
}
