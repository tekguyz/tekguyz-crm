import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { prospectStatusLabel } from "@/lib/prospects/statuses";

// The five values of check_valid_prospect_status, mapped onto the decorative
// pill palette. Colour here is signal, not decoration: an operator scanning a
// call list needs to find "who have I not rung yet" without reading words.
//
// NOT_INTERESTED is deliberately `neutral`, not a red/danger tone. A business
// that said no is not an error state and not a problem to fix — it is a row
// that should recede. Giving it the loudest colour on the page would make a
// worked-through list look like a wall of failures.
//
// `cold` is not used and must not be: it is the desaturated half of the Going
// Cold SLA rule and belongs to overdue leads only (CLAUDE.md).
const TONES: Record<string, BadgeTone> = {
  NEW: "sky",
  CALLED: "purple",
  CALLBACK: "orange",
  NOT_INTERESTED: "neutral",
  CONVERTED: "green",
};

export function prospectStatusTone(status: string): BadgeTone {
  return TONES[status] ?? "neutral";
}

export function ProspectStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={prospectStatusTone(status)} dot>
      {prospectStatusLabel(status)}
    </Badge>
  );
}
