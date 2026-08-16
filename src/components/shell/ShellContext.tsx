"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  writeSidebarCookie,
  type SidebarState,
} from "@/lib/shell/sidebar-cookie";

// Two pieces of shell-wide state, in one provider mounted once in AppShell.
//
// Command-palette state used to live inside Header, which meant the ⌘K
// listener only existed where the Header did. It moves here because the mobile
// bottom bar has no header search affordance to borrow state from, and the
// shortcut has to work from every route either way.
//
// Sidebar collapse state is seeded from the server-read cookie, so the very
// first client render agrees with the HTML that arrived — no flash, no
// hydration mismatch. See src/lib/shell/sidebar-cookie.ts for why it is a
// cookie and not localStorage.

interface ShellContextValue {
  sidebar: SidebarState;
  collapsed: boolean;
  toggleSidebar: () => void;
  commandOpen: boolean;
  openCommand: () => void;
  closeCommand: () => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({
  initialSidebar,
  children,
}: {
  initialSidebar: SidebarState;
  children: ReactNode;
}) {
  const [sidebar, setSidebar] = useState<SidebarState>(initialSidebar);
  const [commandOpen, setCommandOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebar((current) => {
      const next: SidebarState = current === "collapsed" ? "expanded" : "collapsed";
      writeSidebarCookie(next);
      return next;
    });
  }, []);

  const openCommand = useCallback(() => setCommandOpen(true), []);
  const closeCommand = useCallback(() => setCommandOpen(false), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const value = useMemo(
    () => ({
      sidebar,
      collapsed: sidebar === "collapsed",
      toggleSidebar,
      commandOpen,
      openCommand,
      closeCommand,
    }),
    [sidebar, toggleSidebar, commandOpen, openCommand, closeCommand],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const context = useContext(ShellContext);
  if (!context) throw new Error("useShell must be used within a ShellProvider");
  return context;
}
