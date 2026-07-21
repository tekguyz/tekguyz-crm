"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import Fuse from "fuse.js";
import { Search } from "lucide-react";
import { fetchSearchableContacts } from "@/lib/leads/actions";
import type { ContactLead } from "@/lib/leads/queries";
import { CommandResultItem } from "@/components/command/CommandResultItem";
import { ProfileSheet } from "@/components/leads/profile/ProfileSheet";

const MAX_RESULTS = 8;

export function CommandBar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [contacts, setContacts] = useState<ContactLead[] | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedLead, setSelectedLead] = useState<ContactLead | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Refetch every time the palette opens — cheap, and keeps results in sync
  // with edits made elsewhere in the app during the same session.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    fetchSearchableContacts().then(setContacts);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const fuse = useMemo(() => {
    if (!contacts) return null;
    return new Fuse(contacts, {
      keys: [
        { name: "client_name", weight: 2 },
        { name: "company", weight: 1.5 },
        { name: "email", weight: 1 },
        { name: "phone", weight: 1 },
      ],
      threshold: 0.35,
    });
  }, [contacts]);

  const results: ContactLead[] = query.trim()
    ? (fuse?.search(query).map((r) => r.item) ?? []).slice(0, MAX_RESULTS)
    : (contacts ?? []).slice(0, MAX_RESULTS);

  function handleSelect(lead: ContactLead) {
    setSelectedLead(lead);
    onClose();
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const lead = results[activeIndex];
      if (lead) handleSelect(lead);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-ink-main/40"
            />
            <motion.div
              key="palette"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="fixed top-24 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-lg border border-hairline bg-canvas-pure shadow-elevation-2"
            >
              <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
                <Search className="size-4 shrink-0 text-ink-muted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Search contacts…"
                  className="w-full bg-transparent text-sm text-ink-main outline-none placeholder:text-ink-muted"
                />
              </div>

              <div className="max-h-80 overflow-y-auto p-2">
                {contacts === null ? (
                  <p className="p-3 text-sm text-ink-muted">Loading…</p>
                ) : results.length === 0 ? (
                  <p className="p-3 text-sm text-ink-muted">No contacts found.</p>
                ) : (
                  results.map((lead, index) => (
                    <CommandResultItem
                      key={lead.id}
                      lead={lead}
                      active={index === activeIndex}
                      onSelect={() => handleSelect(lead)}
                      onHover={() => setActiveIndex(index)}
                    />
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {selectedLead && (
        <ProfileSheet
          lead={selectedLead}
          open={!!selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </>,
    document.body,
  );
}
