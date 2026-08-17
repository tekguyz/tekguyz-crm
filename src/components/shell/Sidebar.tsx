"use client";

import { useShell } from "@/components/shell/ShellContext";
import { SidebarCollapseToggle } from "@/components/shell/SidebarCollapseToggle";
import { SidebarNav } from "@/components/shell/SidebarNav";
import { SidebarQuickAction } from "@/components/shell/SidebarQuickAction";
import { WorkspaceBlock } from "@/components/shell/WorkspaceBlock";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

// Desktop only. `hidden md:block` is what makes the sidebar and the mobile
// bottom tab bar mutually exclusive: display:none takes the whole subtree out
// of the accessibility tree and out of the tab order, so a phone has exactly
// one navigation landmark and one set of focusable nav links, never two. The
// in-flow spacer below carries the same `hidden md:block`, so below md it
// occupies no space either.
//
// It is a CSS rule rather than a JS media query on purpose. A viewport check
// cannot run on the server, so a JS-gated sidebar would render on a phone's
// first paint and unmount a frame later — the exact flash the collapse cookie
// exists to avoid, reintroduced on the axis it cannot help with.
//
// THE COLLAPSE ANIMATES `translate`, NEVER `width`. The rail is OVERLAID
// (absolutely positioned), not a flex sibling that pushes the content area.
// Animating `width` on a `shrink-0` flex sibling relaid out the entire content
// area on every frame, which measured 30fps falling to 20fps on the Pipeline
// board; see docs/ADDENDA_LOG.md § 2026-08-17 — sidebar collapse: transform-
// based overlaid rail.
//
// Two counter-translated layers reproduce a width animation on the compositor:
//
//   outer  240px frame, overflow-hidden, translate 0 → -184px
//   inner  the real sidebar column, translate 0 → +184px
//
// The inner layer's net screen position therefore never moves; only the outer
// frame's right edge sweeps in from 240px to 56px, which is visually a width
// animation with no layout. Both layers move on `translate`, so nothing outside
// the sidebar is measured, laid out or painted mid-transition.
//
// Both are plain CSS transitions, so the global prefers-reduced-motion block in
// globals.css clamps them to 0.01ms for anyone who has asked for that. There is
// no JS animation here to slip past it.
// Class names are written out in full at every call site below, never composed
// from variables: Tailwind extracts them by scanning this file as text, so a
// template-built `translate-x-[${n}px]` produces no CSS at all. w-14 = 56px
// (rail), w-60 = 240px (panel), 184px = the difference both layers travel.

export function Sidebar({ orgName }: { orgName: string }) {
  const { collapsed } = useShell();

  return (
    <TooltipProvider>
      {/* The content area's leading offset. It is in flow where the <aside>
          used to be, so the content column is never underneath the rail — but
          it is NOT transitioned: its width flips once, in the same commit as
          the toggle, instead of being relaid out on every animation frame. */}
      <div
        aria-hidden
        className={cn("hidden shrink-0 md:block", collapsed ? "w-14" : "w-60")}
      />
      <aside
        className={cn(
          "absolute inset-y-0 left-0 z-20 hidden w-60 overflow-hidden border-r border-hairline bg-canvas-pure transition-transform duration-200 md:block",
          collapsed && "-translate-x-[184px]",
        )}
      >
        <div
          className={cn(
            "flex h-full flex-col transition-transform duration-200",
            collapsed ? "w-14 translate-x-[184px]" : "w-60",
          )}
        >
          <WorkspaceBlock orgName={orgName} collapsed={collapsed} />
          <SidebarNav collapsed={collapsed} />
          <SidebarQuickAction />
          <SidebarCollapseToggle />
        </div>
      </aside>
    </TooltipProvider>
  );
}
