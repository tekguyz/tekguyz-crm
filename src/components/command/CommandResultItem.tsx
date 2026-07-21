import type { ContactLead } from "@/lib/leads/queries";

export function CommandResultItem({
  lead,
  active,
  onSelect,
  onHover,
}: {
  lead: ContactLead;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`flex w-full flex-col rounded-md px-3 py-2 text-left transition-colors ${
        active ? "bg-canvas-soft" : ""
      }`}
    >
      <span className="truncate text-sm font-medium">{lead.client_name}</span>
      <span className="truncate text-xs text-ink-muted">
        {[lead.company, lead.email].filter(Boolean).join(" · ")}
      </span>
    </button>
  );
}
