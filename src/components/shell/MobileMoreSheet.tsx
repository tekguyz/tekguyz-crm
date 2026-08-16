"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { IconDots, IconHelpCircle, IconLogout } from "@tabler/icons-react";

import { signOut } from "@/lib/auth/actions";
import { useHelp } from "@/components/help/HelpContext";
import { SECONDARY_NAV, isNavItemActive } from "@/components/shell/nav-items";
import { ThemeChoiceGroup } from "@/components/shell/ThemeChoiceGroup";
import { Button } from "@/components/ui/Button";
import { NavItem } from "@/components/ui/NavItem";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";

// The fourth slot of the mobile tab bar. It holds SECONDARY items only —
// Import, Settings, theme, Help, sign out. The three destinations that matter
// on a phone stay as real tabs; this is not a hamburger standing in for
// navigation.
//
// It is also where workspace identity lives on mobile, since the sidebar's
// WorkspaceBlock is not displayed below md and the header is deliberately
// limited to two concerns.
export function MobileMoreSheet({ orgName, userEmail }: { orgName: string; userEmail: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { openHelp } = useHelp();
  const triggerRef = useRef<HTMLButtonElement>(null);

  function handleHelp() {
    // Same reasoning as IdentityMenu: HelpContext restores focus to whatever
    // was focused when the drawer opened, so the still-mounted trigger is
    // focused first rather than a sheet row that is on its way out.
    const trigger = triggerRef.current;
    setOpen(false);
    requestAnimationFrame(() => {
      trigger?.focus();
      openHelp();
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          aria-label="More"
          className="text-caption h-auto flex-1 flex-col gap-1 rounded-md px-2 py-1.5 font-normal"
        >
          <IconDots className="size-5" stroke={1.75} />
          More
        </Button>
      </SheetTrigger>

      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{orgName}</SheetTitle>
          <SheetDescription>{userEmail}</SheetDescription>
        </SheetHeader>

        <nav aria-label="More" className="space-y-0.5">
          {SECONDARY_NAV.map(({ href, label, icon }) => (
            <SheetClose asChild key={href}>
              <NavItem href={href} icon={icon} active={isNavItemActive(pathname, href)}>
                {label}
              </NavItem>
            </SheetClose>
          ))}
        </nav>

        <ThemeChoiceGroup />

        <div className="space-y-2 border-t border-hairline pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleHelp}
            className="w-full justify-start"
          >
            <IconHelpCircle className="size-5" stroke={1.75} />
            Help
          </Button>
          {/* The Server Action is untouched; only its call site moved out of
              the header. The form carries no named fields, so there is no
              field parity to preserve. */}
          <form action={signOut}>
            <Button type="submit" variant="secondary" className="w-full justify-start">
              <IconLogout className="size-5" stroke={1.75} />
              Sign out
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
