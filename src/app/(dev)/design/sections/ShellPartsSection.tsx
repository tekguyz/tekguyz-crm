"use client";

import { IconDots, IconLogout, IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OptionRow } from "@/components/ui/OptionRow";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// The four primitives the shell redesign added. Like Popover, all four are
// Radix-portaled, so an OPEN menu/sheet/tooltip renders in the AMBIENT theme,
// not this pane's — see the note at the top of OverlaysSection for why. Verify
// their theming by toggling the real app theme, not by comparing panes.
// OptionRow is inline and follows its pane normally.
export function ShellPartsSection() {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        <h3 className="text-h2">Shell primitives</h3>

        <div className="flex flex-col gap-2">
          <span className="text-label text-ink-muted">
            Tooltip (Level 1) — hover or keyboard-focus the trigger
          </span>
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent side="right">Collapsed rail label</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-label text-ink-muted">
            DropdownMenu (Level 1) — items, radio items, danger variant
          </span>
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">
                  <IconDots className="size-5" stroke={1.75} />
                  Open menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel className="text-label text-ink-muted">Theme</DropdownMenuLabel>
                <DropdownMenuRadioGroup value="system">
                  <DropdownMenuRadioItem value="system">
                    <IconDeviceDesktop className="size-4" stroke={1.75} />
                    System
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="light">
                    <IconSun className="size-4" stroke={1.75} />
                    Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <IconMoon className="size-4" stroke={1.75} />
                    Dark
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="danger">
                  <IconLogout className="size-4" stroke={1.75} />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-label text-ink-muted">
            Sheet (Level 2) — bottom edge, the mobile &quot;More&quot; surface
          </span>
          <div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="secondary">Open sheet</Button>
              </SheetTrigger>
              <SheetContent aria-describedby={undefined}>
                <SheetHeader>
                  <SheetTitle>Sheet title</SheetTitle>
                </SheetHeader>
                <p className="text-body-md text-ink-muted">
                  Level 2 elevation, same as the modal — it dims the page and traps
                  focus. Closes on Escape, on backdrop click and on the X.
                </p>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-label text-ink-muted">
            OptionRow — listbox row, selected and unselected
          </span>
          <div role="listbox" aria-label="OptionRow sample" className="rounded-md border border-hairline bg-canvas-pure p-2">
            <OptionRow selected>
              <span className="text-body-md truncate font-medium">Amanda Chu</span>
              <span className="text-body-sm truncate text-ink-muted">
                GreenScape Landscaping · amanda@example.com
              </span>
            </OptionRow>
            <OptionRow>
              <span className="text-body-md truncate font-medium">Ben Whitaker</span>
              <span className="text-body-sm truncate text-ink-muted">
                Whitaker Roofing · ben@example.com
              </span>
            </OptionRow>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
