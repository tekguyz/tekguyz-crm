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
