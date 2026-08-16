"use client";

import { useRef } from "react";
import { IconHelpCircle, IconLogout, IconChevronDown } from "@tabler/icons-react";

import { signOut } from "@/lib/auth/actions";
import { useHelp } from "@/components/help/HelpContext";
import { ThemeMenuChoices } from "@/components/shell/ThemeMenuChoices";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// One control where the header used to hold five: name, avatar, theme toggle,
// help and sign out were all doing the same job — identity and account
// actions — and each was paying for its own slot.
//
// The sign-out <form> is rendered OUTSIDE DropdownMenuContent and submitted by
// requestSubmit() from the menu item. Radix portals the menu and unmounts it on
// select, so a form nested inside the content would be racing its own removal;
// this one outlives the menu. Keeping it a real <form action={signOut}> rather
// than an onClick means the Server Action call site is unchanged in kind — and
// the menu row stays a menu item instead of a bare <button> wearing a
// primitive's classes. The action itself is untouched, and the form carries no
// named fields, so there is no field parity to preserve.
export function IdentityMenu({
  userEmail,
  displayName,
}: {
  userEmail: string;
  displayName: string | null;
}) {
  const { openHelp } = useHelp();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const signOutRef = useRef<HTMLFormElement>(null);

  const name = displayName || userEmail;

  function handleHelp() {
    // HelpContext captures document.activeElement when the drawer opens, and
    // restores it on close. Selecting a menu item leaves focus on a row that
    // is about to unmount, so the trigger is focused explicitly first — it
    // outlives the menu and is where focus belongs when the drawer closes.
    const trigger = triggerRef.current;
    requestAnimationFrame(() => {
      trigger?.focus();
      openHelp();
    });
  }

  function handleSignOut() {
    signOutRef.current?.requestSubmit();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            variant="ghost"
            aria-label={`Account menu for ${name}`}
            className="gap-2 pr-1.5 pl-1.5"
          >
            <span
              aria-hidden="true"
              className="text-label flex size-6 shrink-0 items-center justify-center rounded-full border border-hairline bg-canvas-soft text-ink-main uppercase"
            >
              {name.slice(0, 1) || "?"}
            </span>
            {/* The name is a comfort, not the control. It goes first when the
                header gets tight; the avatar and the affordance stay. */}
            <span className="hidden max-w-32 truncate sm:inline">{name}</span>
            <IconChevronDown className="size-4 text-ink-muted" stroke={1.75} />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="flex flex-col">
            <span className="text-title truncate">{name}</span>
            <span className="text-body-sm truncate text-ink-muted">{userEmail}</span>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />
          <ThemeMenuChoices />

          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleHelp}>
            <IconHelpCircle className="size-4" stroke={1.75} />
            Help
          </DropdownMenuItem>
          <DropdownMenuItem variant="danger" onSelect={handleSignOut}>
            <IconLogout className="size-4" stroke={1.75} />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <form ref={signOutRef} action={signOut} className="hidden" />
    </>
  );
}
