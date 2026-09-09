"use client";

import { useId, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";

import type { ShellNavItem } from "@/components/shell/nav-items";
import {
  SidebarRailExpand,
  SidebarWorkspaceRow,
} from "../preview/SidebarChrome";
import { Button } from "@/components/ui/Button";
import { NavItem } from "@/components/ui/NavItem";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import { NAV_FOOTER, NAV_GROUPS } from "../preview/nav-groups";

// VARIANT B — "Disclosure". The Plan CRM reference, adapted.
//
// Each group is a real collapsible section: a parent row with a chevron that
// rotates, and indented children behind a vertical guide rule. The group
// holding the current route starts open; the others start closed, so the rail
// shows three or four rows instead of seven and the current context is the
// only thing expanded.
//
// TWO THINGS THE REFERENCE DOES THAT THIS DELIBERATELY DOES NOT.
//
// The reference's parents ("Contacts", "Deals") are destinations as well as
// parents — clicking one navigates AND expands. Ours are not, because we have
// no route to put behind "Work" or "Prospecting" and inventing one is outside
// this exploration. So a parent is a <button>, not a <Link>: it discloses and
// does nothing else, which is exactly what `aria-expanded` on a button means.
// A link that also toggles is the ambiguous version of this control and is the
// usual source of "I clicked the group and it went somewhere".
//
// The reference also highlights the open parent. Ours does not: `--accent` on
// a nav row means "you are here", and a parent is never anywhere. The open
// state is carried by the chevron's rotation and by the children being
// visible, and the accent stays on the one child that is actually current.
//
// COLLAPSED, THE DISCLOSURE IS GONE, NOT SHRUNK. A 56px rail has no room for a
// chevron, an indent guide, or a caption, and a rail row that expands into a
// flyout is a different component with its own focus-management problem. The
// rail therefore flattens to the same plain icon list the shipped sidebar has
// today, with a hairline between the groups. That is the honest cost of this
// variant and is the main thing to weigh against Variant A.

export function DisclosureSidebar({
  collapsed,
  activeHref,
  orgName = "TEKGUYZ",
}: {
  collapsed: boolean;
  activeHref: string;
  orgName?: string;
}) {
  // Only the group containing the current route starts open. Seeded from a
  // prop rather than a router so the comp can show any state; the shipped
  // version would read usePathname() the way SidebarNav already does.
  const [openCaptions, setOpenCaptions] = useState<string[]>(() =>
    NAV_GROUPS.filter((g) => g.items.some((i) => i.href === activeHref)).map(
      (g) => g.caption,
    ),
  );

  function toggle(caption: string) {
    setOpenCaptions((current) =>
      current.includes(caption)
        ? current.filter((c) => c !== caption)
        : [...current, caption],
    );
  }

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-hairline bg-canvas-pure",
          collapsed ? "w-14" : "w-60",
        )}
      >
        <SidebarWorkspaceRow orgName={orgName} collapsed={collapsed} />

        <nav aria-label="Main" className="flex-1 overflow-y-auto p-2">
          {collapsed ? <SidebarRailExpand /> : null}
          {collapsed
            ? NAV_GROUPS.map((group, index) => (
                <div
                  key={group.caption}
                  role="group"
                  aria-label={group.caption}
                  className={cn(
                    "space-y-0.5",
                    index > 0 && "mt-2 border-t border-hairline pt-2",
                  )}
                >
                  {group.items.map((item) => (
                    <RailItem key={item.href} item={item} active={item.href === activeHref} />
                  ))}
                </div>
              ))
            : NAV_GROUPS.map((group) => (
                <DisclosureGroup
                  key={group.caption}
                  caption={group.caption}
                  items={group.items}
                  activeHref={activeHref}
                  open={openCaptions.includes(group.caption)}
                  onToggle={() => toggle(group.caption)}
                />
              ))}
        </nav>

        <div className="shrink-0 space-y-0.5 border-t border-hairline p-2">
          {NAV_FOOTER.map((item) =>
            collapsed ? (
              <RailItem key={item.href} item={item} active={item.href === activeHref} />
            ) : (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                active={item.href === activeHref}
              >
                {item.label}
              </NavItem>
            ),
          )}
        </div>

        {/* Inert stand-in for SidebarQuickAction — see SectionedSidebar. */}
        <div className="shrink-0 border-t border-hairline p-2">
          <Button variant="primary" className={cn("w-full", collapsed && "px-0")}>
            <span aria-hidden="true" className="text-body-md leading-none">
              +
            </span>
            <span className={cn(collapsed && "sr-only")}>New lead</span>
          </Button>
        </div>

      </aside>
    </TooltipProvider>
  );
}

function DisclosureGroup({
  caption,
  items,
  activeHref,
  open,
  onToggle,
}: {
  caption: string;
  items: ShellNavItem[];
  activeHref: string;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();

  return (
    <div className="mb-1">
      {/* A ghost Button, not a hand-styled <button>: the parent row is a
          control and gets the primitive's classes, its hover, and — because
          `outline-none` is nowhere near it — the global :focus-visible ring. */}
      <Button
        variant="ghost"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="text-label w-full justify-between px-3 uppercase"
      >
        {caption}
        <IconChevronDown
          aria-hidden="true"
          className={cn("size-4 transition-transform", open && "rotate-180")}
          stroke={1.75}
        />
      </Button>

      {/* `hidden` rather than unmounting: the panel keeps a stable id for
          aria-controls, which a screen reader can follow before it is opened.
          The UA stylesheet's own [hidden] { display: none } is what hides it —
          so this element must never carry a display utility of its own, which
          would win the cascade and leave a "closed" group visible and
          focusable. Verified in the browser, not assumed. */}
      <div id={panelId} hidden={!open} className="mt-0.5 ml-4 space-y-0.5 border-l border-hairline pl-2">
        {items.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            active={item.href === activeHref}
          >
            {item.label}
          </NavItem>
        ))}
      </div>
    </div>
  );
}

function RailItem({ item, active }: { item: ShellNavItem; active: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavItem href={item.href} icon={item.icon} active={active} layout="rail">
          {item.label}
        </NavItem>
      </TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}
