import Link from "next/link";
import { Button } from "@/components/ui/Button";

export type FilterTab = {
  label: string;
  href: string;
  active: boolean;
};

// A row of link-shaped filter tabs, used by Prospects, Reports and the view
// bar's Board / Table switch. No directive, so server and client components
// both render it: every tab is a plain <Link> to a
// searchParams variant of the same route, so the filtering itself stays a
// server query and there is no client filter state anywhere.
//
// Built on Button's `asChild` rather than a local class string. Contacts had
// exactly such a local `tabClass` helper before this; adding a second copy on
// the Pipeline page is the hand-copied-primitive drift CLAUDE.md warns about,
// so the helper was replaced by this instead of duplicated. The inactive tab
// takes one token override — ghost is border-transparent, and these tabs read
// as a group only if every tab keeps its hairline — which is a single-property
// adjustment to the primitive, not a restatement of its variant.
//
// A named group, not a <nav>: these filter one list, they do not move between
// destinations, and Contacts' two unnamed <nav>s were announced as two more
// "navigation" landmarks beside the real one. `label` names what the group
// filters by ("Status", "Owner", "Period").
export function FilterTabs({ label, tabs }: { label: string; tabs: FilterTab[] }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      {tabs.map((tab) => (
        <Button
          key={tab.href}
          asChild
          size="sm"
          variant={tab.active ? "secondary" : "ghost"}
          className={tab.active ? undefined : "border-hairline"}
        >
          {/* aria-current is what tells a screen reader which filter is on;
              the colour difference alone does not. */}
          <Link href={tab.href} aria-current={tab.active ? "page" : undefined}>
            {tab.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
