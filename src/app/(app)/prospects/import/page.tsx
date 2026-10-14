import type { Metadata } from "next";

import { ProspectImportPanel } from "@/components/prospects/ProspectImportPanel";

export const metadata: Metadata = { title: "Import prospects" };

// Its own route, not a tab on /import. The two importers share no state, no
// validation and no destination table: /import writes leads (email-keyed,
// email required), this writes prospects (place_id-keyed, no email at all).
// Folding them together would put the "which kind of file is this" decision on
// the operator every time, and a wrong answer there is a wrong table.
export default function ProspectImportPage() {
  return (
    <div className="space-y-4">
      <p className="text-body-md text-ink-muted">
        Load a CSV of Google Business Profile listings. Prospects are cold outreach
        — they have no email address and stay out of your pipeline until a call turns one into a
        lead.
      </p>

      <ProspectImportPanel />
    </div>
  );
}
