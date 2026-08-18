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
    keywords: ["webhook", "inbound", "zapier", "url", "secret", "rotate", "integration", "form", "signature", "hmac"],
    body: [
      "Your webhook endpoint and signing secret live on the Settings page, under Organization. Owners and admins only — the secret isn't fetched at all for members.",
      "The endpoint URL identifies your organization but grants no access on its own, so it's safe to paste into a config file or a ticket. Every POST to it must also carry an X-TekGuyz-Signature header: the hex-encoded HMAC-SHA256 of the exact request body, keyed by your signing secret. A request without a valid signature is rejected with a 401 and nothing is saved.",
      "The signing secret is the credential — treat it like a password. It is never sent with a request, so it never appears in a URL or a server log; it only ever keys the signature.",
      "This needs somewhere that can run code, so a browser-side form cannot call the endpoint directly — it would have to ship the secret to every visitor. Post your form to your own backend, and have that backend sign and forward.",
      "If the secret leaks, use \"Rotate signing secret\" on the same panel. It asks you to confirm first, because rotating takes effect immediately — every integration still signing with the old secret starts failing the moment you confirm, and keeps failing until you update it. The endpoint URL does not change when you rotate.",
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
