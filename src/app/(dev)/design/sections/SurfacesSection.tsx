import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { BadgeTone } from "@/components/ui/Badge";

// Every tone is listed literally rather than derived from the Badge module's
// own TONES map: the point of this page is to catch a tone whose class string
// never reached Tailwind's scanner, and reusing the source of truth would hide
// exactly that failure.
const TONES: { name: string; tone: BadgeTone }[] = [
  { name: "neutral", tone: "neutral" },
  { name: "purple", tone: "purple" },
  { name: "pink", tone: "pink" },
  { name: "orange", tone: "orange" },
  { name: "teal", tone: "teal" },
  { name: "green", tone: "green" },
  { name: "sky", tone: "sky" },
  { name: "cold", tone: "cold" },
];

export function SurfacesSection() {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-h2">Card</h3>
      <div className="flex flex-col gap-3">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <span className="text-title">Northwind Traders</span>
            <Badge tone="green" dot>
              Won
            </Badge>
          </div>
          <p className="text-body-sm mt-1 text-ink-muted">
            Level 0 surface — hairline border, no shadow.
          </p>
        </Card>

        <Card cold>
          <div className="flex items-center justify-between gap-2">
            <span className="text-title">Contoso Ltd</span>
            <Badge tone="cold" dot>
              Going Cold
            </Badge>
          </div>
          <p className="text-body-sm mt-1 text-ink-muted">
            next_action_at is overdue — dashed --cold border, desaturated badge.
          </p>
        </Card>
      </div>

      <h3 className="text-h2">Badge</h3>
      <div className="flex flex-wrap items-center gap-2">
        {TONES.map(({ name, tone }) => (
          <Badge key={name} tone={tone}>
            {name}
          </Badge>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {TONES.map(({ name, tone }) => (
          <Badge key={name} tone={tone} dot>
            {name}
          </Badge>
        ))}
      </div>
    </div>
  );
}
