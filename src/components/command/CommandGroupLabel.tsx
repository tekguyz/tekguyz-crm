// The section label above each group of palette results ("Contacts", "Tasks").
//
// A sibling of CommandResultItem rather than a `src/components/ui/` primitive:
// it adds no behaviour, only the project's existing section-heading recipe —
// the same `text-label uppercase text-ink-muted` role TasksSection already
// uses for its own "Tasks" heading. Extracting it here keeps CommandBar from
// restating that class string once per group, which is the same drift shape
// CLAUDE.md warns about for hand-copied primitives.
//
// `role="presentation"` because the real accessible name for the group is
// carried by the wrapping role="group"'s aria-labelledby pointing at this id —
// announcing the heading twice would be noise inside a listbox.
export function CommandGroupLabel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="presentation" className="text-label px-3 pt-2 pb-1 uppercase text-ink-muted">
      {children}
    </p>
  );
}
