import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

// Stand-in page content, so the chrome is judged against something with real
// density rather than against an empty box. It is not a rebuild of the Today
// view and is not wired to anything — three lead cards and a heading is enough
// weight to show whether a header reads as "huge and plain" beside it.
//
// The names are obvious fixtures. Nothing here is seeded, written or read.
const ROWS = [
  { name: "Northgate Dental", note: "Quote sent · follow up Tue", tone: "sky" as const, status: "Contacted" },
  { name: "Vela Roofing", note: "No answer · 3rd attempt", tone: "cold" as const, status: "Going cold" },
  { name: "Harbour Physio", note: "Booked install for Friday", tone: "green" as const, status: "Won" },
];

// `title` is optional because Variant C moves the page title into the header;
// omitting it here is what stops that comp showing the same words twice.
export function FakeContent({ title }: { title?: string }) {
  return (
    <div className="flex flex-col gap-4">
      {/* No "New lead" button here on purpose: the shell's one primary CTA
          lives in the sidebar (and, on a phone, is reached from it), so a
          second one in the content would be a duplicate the real app does not
          have — and in Variant C, where the title moves to the header, it
          would be the only thing left in this row. */}
      {title ? <h2 className="text-h1">{title}</h2> : null}

      <div className="flex flex-col gap-2">
        {ROWS.map((row) => (
          <Card key={row.name} cold={row.tone === "cold"} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="text-title truncate">{row.name}</p>
              <p className="text-body-sm truncate text-ink-muted">{row.note}</p>
            </div>
            <Badge tone={row.tone}>{row.status}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
