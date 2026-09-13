"use client";

import { useRef } from "react";
import { IconLogout, IconChevronDown } from "@tabler/icons-react";

import { signOut } from "@/lib/auth/actions";
import { ThemeMenuChoices } from "@/components/shell/ThemeMenuChoices";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// The avatar menu, holding ACCOUNT-SCOPED things only: who you are signed in
// as, theme, sign out. Since Shell/IA Variant C, Help is a header icon of its
// own (HelpTrigger) and Settings stays a sidebar destination — a real page
// buried in an account popover cannot be found or linked.
//
// The trigger is the avatar and a chevron, no name. The name is the button's
// accessible name and the first line of the menu it opens; on a 48px header it
// is the first thing that would push the bar wider. The avatar is the shipped
// src/components/ui/Avatar.tsx by `name` — never a second implementation.
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
  const signOutRef = useRef<HTMLFormElement>(null);

  const name = displayName || userEmail;

  function handleSignOut() {
    signOutRef.current?.requestSubmit();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            aria-label={`Account menu for ${name}`}
            className="gap-1.5 pr-1.5 pl-1.5"
          >
            <Avatar size="sm" name={name} />
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
