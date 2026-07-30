// Static, hardcoded help copy — quick-reference answers, not documentation.
// Every claim below was written against the real components it describes
// (CsvUploadDropzone/ColumnMappingTable, OrgDetailsPanel, ApiKeysPanel); if
// one of those changes behavior, this copy has to change with it.

export interface HelpTopic {
  id: string;
  title: string;
  body: string;
  keywords: string[];
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: "csv-import",
    title: "Importing contacts from a CSV",
    keywords: ["csv", "import", "upload", "mapping", "columns", "spreadsheet", "migrate", "rows"],
    body: [
      "Drop a CSV on the Import page. The first row must be your column headers, and a file can hold up to 1,000 rows — anything larger is rejected outright rather than silently truncated, so split it and import in batches.",
      "On the mapping step, columns are matched to fields automatically wherever the header is unambiguous (\"Email Address\", \"Full Name\", \"Phone Number\" and similar all resolve on their own). It only auto-maps exact matches, so an unusual header simply lands on \"Ignore\" instead of being guessed wrong.",
      "To fix a mapping, change the dropdown in that row's \"Maps to\" column. Anything left on \"Ignore\" is not imported. Each field can only be filled by one column — map two columns to the same field and you'll get a warning naming both.",
      "The pills at the top track the two required fields, Client Name and Email. Orange means still unmapped; green means satisfied. Continue stays disabled until both are green.",
    ].join("\n\n"),
  },
  {
    id: "webhook-setup",
    title: "Setting up the inbound lead webhook",
    keywords: ["webhook", "inbound", "zapier", "url", "secret", "rotate", "integration", "form"],
    body: [
      "Your webhook URL lives on the Settings page, under Organization. Owners and admins only — it isn't fetched at all for members.",
      "POST inbound leads to that URL from Zapier, a form provider, or anything else. The URL is tenant-scoped and authenticates the request by itself: the secret is embedded in the URL, so treat the whole thing as a credential and don't paste it anywhere public.",
      "If it leaks, use \"Rotate webhook secret\" on the same panel. It asks you to confirm first, because rotating takes effect immediately — every integration still POSTing to the old URL starts failing the moment you confirm, and keeps failing until you update it with the new URL. Copy the new URL and update your integrations right away.",
    ].join("\n\n"),
  },
  {
    id: "api-keys",
    title: "Configuring your own AI API keys",
    keywords: ["api", "key", "gemini", "anthropic", "byo", "ai", "credentials", "clear", "vault"],
    body: [
      "AI features can run on your own provider keys. Configure them on the Settings page under API Keys — owners and admins only.",
      "Two providers are supported today: Gemini and Anthropic. A configured key shows as \"•••• configured\" and is never displayed back to you.",
      "Keys are stored server-side and encrypted at rest; they're only ever read by the server when an AI feature runs. Leaving a field blank on save keeps the existing key unchanged, so you never have to re-enter one to edit the other.",
      "\"Clear\" removes a configured key after a confirmation step. Once cleared, AI features for the org fall back to the platform key if one exists, or stop working until you save a new key.",
    ].join("\n\n"),
  },
];
