// Single source for the strings that describe the product to the outside
// world. They were previously duplicated across layout.tsx, manifest.ts and
// opengraph-image.tsx, which is the same drift shape as the Form/Action field
// parity bug: three copies, no error when one falls behind, and the wrong one
// is the one a stranger sees. Import from here; never retype the literal.

export const BRAND = {
  name: "TEKGUYZ CRM",
  shortName: "TEKGUYZ",

  // Written for a human who has never seen the product, and short enough to
  // survive a search snippet (~155 chars) and a Slack unfurl uncut. The old
  // "Multi-tenant sales & operations CRM" described the architecture rather
  // than the job — "multi-tenant" is an implementation fact that means nothing
  // to a reader and says nothing about what the tool does for them.
  description:
    "Track every lead from first enquiry to closed deal. Pipeline, follow-ups, and revenue in one place.",

  // Approved 2026-08-15. Restates the mark's own idea — three sources
  // converging into one pipeline.
  tagline: "Every lead, one pipeline.",
} as const;

// The Landing Page's copy (#32). Every point restates a shipped capability from
// PRODUCT.md § Positioning — no customer, figure or claim the product cannot
// back. Changing a point means the product changed first.
export const LANDING = {
  demoNote: "Your own workspace with sample data. No signup, no email.",
  points: [
    {
      title: "Leads from your website",
      body: "Your site's enquiry form posts straight into the pipeline over a signed webhook. Nothing is retyped.",
    },
    {
      title: "One pipeline",
      body: "Every lead moves through clear stages, from first enquiry to won or lost. Revenue is recorded, not guessed.",
    },
    {
      title: "Follow-ups that stick",
      body: "Every lead carries its next action. A lead that goes quiet is flagged Going Cold before it is lost.",
    },
  ],
  builtBy: { label: "Built by TEKGUYZ", href: "https://tekguyz.com" },
} as const;
