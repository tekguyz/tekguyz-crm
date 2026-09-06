"use client";

import type { ProspectSearchResult } from "@/lib/prospects/queries";
import { OptionRow } from "@/components/ui/OptionRow";
import { prospectStatusLabel } from "@/lib/prospects/statuses";

// The Prospects-group mirror of CommandResultItem / CommandTaskItem: OptionRow
// owns the row's semantics and appearance, this owns which fields appear on it.
//
// The subtitle carries where the business is and where it stands, because a
// scraped list has many similar names in different towns — that is the pair an
// operator needs to know they picked the right one.
export function CommandProspectItem({
  id,
  prospect,
  active,
  onSelect,
  onHover,
}: {
  id: string;
  prospect: ProspectSearchResult;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  const subtitle = [prospect.city, prospect.category, prospectStatusLabel(prospect.status)]
    .filter(Boolean)
    .join(" · ");

  return (
    <OptionRow id={id} selected={active} onClick={onSelect} onMouseEnter={onHover}>
      <span className="text-body-md truncate font-medium">{prospect.name}</span>
      <span className="text-body-sm truncate text-ink-muted">{subtitle}</span>
    </OptionRow>
  );
}
