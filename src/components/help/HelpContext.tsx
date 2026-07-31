"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

// Plain React Context, not Zustand — in-memory `isOpen` + `topicId` only, no
// URL param, so unlike ProfileSheetController this needs no useSearchParams()
// and therefore no Suspense boundary at its mount site.

interface HelpContextValue {
  isOpen: boolean;
  topicId: string | null;
  openHelp: (topicId?: string) => void;
  closeHelp: () => void;
  // The element that had focus when the drawer was opened. Radix restores
  // focus to a Dialog's own Trigger, but every opener here lives outside the
  // Dialog root now that the drawer is mounted once in AppShell — so the
  // opener is captured explicitly and restored in HelpDrawer's
  // onCloseAutoFocus. See the Prompt 1 addendum for why this matters.
  openerRef: React.RefObject<HTMLElement | null>;
}

const HelpContext = createContext<HelpContextValue | null>(null);

export function HelpProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [topicId, setTopicId] = useState<string | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const openHelp = useCallback((nextTopicId?: string) => {
    openerRef.current = document.activeElement as HTMLElement | null;
    setTopicId(nextTopicId ?? null);
    setIsOpen(true);
  }, []);

  const closeHelp = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, topicId, openHelp, closeHelp, openerRef }),
    [isOpen, topicId, openHelp, closeHelp],
  );

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}

export function useHelp() {
  const context = useContext(HelpContext);
  if (!context) throw new Error("useHelp must be used within a HelpProvider");
  return context;
}
