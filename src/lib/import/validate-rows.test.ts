import { readFileSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { validateRows } from "@/lib/import/validate-rows";
import { NO_CONTACT_CHANNEL_MESSAGE } from "@/lib/leads/contact-rule";
import { guessMapping, type ParsedCsvRow } from "@/lib/types/csv-import";

// The exact Muse Lead Pack header, with the awkward cells a real pack has:
// multi-line briefs with commas and quotes, commas in names, email-less rows,
// a WhatsApp-only row, a phone-only row, a junk-link row and no-channel rows.
const csv = readFileSync(path.join(import.meta.dirname, "fixtures/muse-lead-pack.csv"), "utf8");
// Same options as CsvUploadDropzone.
const parsed = Papa.parse<ParsedCsvRow>(csv, { header: true, skipEmptyLines: true });
const headers = parsed.meta.fields ?? [];

describe("a Muse Lead Pack", () => {
  it("maps all 13 columns by itself", () => {
    const mapping = guessMapping(headers);
    expect(headers).toHaveLength(13);
    for (const header of headers) expect(mapping[header]).toBe(header);
  });

  const outcome = validateRows(parsed.data, guessMapping(headers));
  const byName = new Map(outcome.valid.map((row) => [row.client_name, row]));

  it("accepts every row with a Contact Channel, email or not", () => {
    expect([...byName.keys()]).toEqual([
      "LJ Air Conditioning Services, Inc.",
      "Phone Only Plumbing",
      "WhatsApp Only Salon",
      "Junk Link Roofing",
      "Email Only Cleaners",
    ]);
    expect(byName.get("Phone Only Plumbing")!.email).toBeNull();
    expect(byName.get("WhatsApp Only Salon")!.social_whatsapp).toBe("https://wa.me/13055550143");
    expect(byName.get("Email Only Cleaners")!.email).toBe("owner@emailonlycleaners.test");
  });

  it("keeps the brief's line breaks, commas and quotes", () => {
    expect(byName.get("LJ Air Conditioning Services, Inc.")!.ai_brief).toBe(
      'Hi LJ team, saw your "same-day" repair posts.\nWould a simple booking page help?\n\nFamily-run HVAC shop, 20 years in Miami.',
    );
  });

  it("keeps the file's lead_source", () => {
    expect(byName.get("LJ Air Conditioning Services, Inc.")!.lead_source).toBe("google-maps");
  });

  it("empties junk link cells and warns, but keeps the lead", () => {
    const junk = byName.get("Junk Link Roofing")!;
    expect(junk.website).toBeNull();
    expect(junk.social_facebook).toBeNull();
    expect(junk.phone).toBe("305.555.0144");
    expect(outcome.warnings).toEqual([
      {
        lineNumber: 5,
        preview: "Junk Link Roofing",
        warnings: [
          '"N/A" is not a web address, so it was left empty.',
          '"N/A" is not a Facebook link, so it was left empty.',
        ],
      },
    ]);
  });

  it("refuses only the rows left with no Contact Channel, and says why", () => {
    expect(outcome.invalid).toEqual([
      { lineNumber: 6, preview: "No Channel Bakery", errors: [NO_CONTACT_CHANNEL_MESSAGE] },
      {
        lineNumber: 8,
        preview: "Junk Only Detailing",
        errors: ['"@junkonlydetailing" is not an Instagram link, so it was left empty.', NO_CONTACT_CHANNEL_MESSAGE],
      },
    ]);
  });
});

describe("validateRows", () => {
  it("names each valid row by its spreadsheet row, so a skipped row can be traced back", () => {
    const outcome = validateRows(
      [
        { Name: "A", Phone: "305" },
        { Name: "", Phone: "305" },
        { Name: "C", Phone: "786" },
      ],
      { Name: "client_name", Phone: "phone" },
    );
    expect(outcome.validLabels).toEqual([
      { lineNumber: 2, preview: "A" },
      { lineNumber: 4, preview: "C" },
    ]);
  });

  it("still refuses a row with no name", () => {
    const outcome = validateRows([{ Name: " ", Phone: "305" }], { Name: "client_name", Phone: "phone" });
    expect(outcome.invalid[0].errors).toEqual(["Client name is required"]);
  });
});
