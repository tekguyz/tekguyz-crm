"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import Fuse from "fuse.js";
import { IconSearch } from "@tabler/icons-react";
import { fetchSearchableContacts } from "@/lib/leads/actions";
import type { ContactLead } from "@/lib/leads/queries";
import { CommandResultItem } from "@/components/command/CommandResultItem";
import { ProfileSheet } from "@/components/leads/profile/ProfileSheet";
import { Input } from "@/components/ui/Input";

const MAX_RESULTS = 8;

// One palette is mounted per shell, so a fixed id is unambiguous. The rows
// need stable ids of their own for aria-activedescendant to point at.
const LISTBOX_ID = "command-bar-results";
const optionId = (leadId: string) => `${LISTBOX_ID}-${leadId}`;

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
              {/* Icon layered over a real Input — the same relative-wrapper +
                  absolute Tabler icon recipe Select uses for its chevron, and
                  the same one HelpDrawer's search uses. Search behaviour,
                  arrow-key handling and the Fuse config above are untouched. */}
              <div className="border-b border-hairline p-3">
                <div className="relative">
                  {/* Combobox pattern: the input keeps DOM focus throughout and
                      names the highlighted row with aria-activedescendant. The
                      rows themselves are non-focusable options — see
                      OptionRow — so arrow keys move a highlight rather than
                      the tab ring. */}
                  <Input
                    autoFocus
                    role="combobox"
                    aria-expanded
                    aria-controls={LISTBOX_ID}
                    aria-autocomplete="list"
                    aria-activedescendant={
                      results[activeIndex] ? optionId(results[activeIndex].id) : undefined
                    }
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActiveIndex(0);
                    }}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Search contacts…"
                    aria-label="Search contacts"
                    className="pl-8"
                  />
                  <IconSearch
                    aria-hidden="true"
                    stroke={1.75}
                    className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-ink-muted"
                  />
                </div>
              </div>

              <div
                id={LISTBOX_ID}
                role="listbox"
                aria-label="Contacts"
                className="max-h-80 overflow-y-auto p-2"
              >
                {contacts === null ? (
                  <p className="text-body-md p-3 text-ink-muted">Loading…</p>
                ) : results.length === 0 ? (
                  <p className="text-body-md p-3 text-ink-muted">No contacts found.</p>
                ) : (
                  results.map((lead, index) => (
                    <CommandResultItem
                      key={lead.id}
                      id={optionId(lead.id)}
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
