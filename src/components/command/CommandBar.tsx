"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import Fuse from "fuse.js";
import { IconSearch } from "@tabler/icons-react";
import { fetchSearchableContacts } from "@/lib/leads/actions";
import { fetchSearchableTasks } from "@/lib/tasks/actions";
import { fetchSearchableProspects } from "@/lib/actions/prospect-actions";
import type { ContactLead } from "@/lib/leads/queries";
import type { TaskSearchResult } from "@/lib/tasks/queries";
import type { ProspectSearchResult } from "@/lib/prospects/queries";
import { CommandResultItem } from "@/components/command/CommandResultItem";
import { CommandTaskItem } from "@/components/command/CommandTaskItem";
import { CommandProspectItem } from "@/components/command/CommandProspectItem";
import { CommandGroupLabel } from "@/components/command/CommandGroupLabel";
import { ProfileSheet } from "@/components/leads/profile/ProfileSheet";
import { Input } from "@/components/ui/Input";

// Per group, not overall — otherwise a query matching many contacts could
// push the Tasks or Prospects group off the list entirely and the palette
// would look like it never searched them at all.
const MAX_RESULTS = 8;

// One palette is mounted per shell, so a fixed id is unambiguous. The rows
// need stable ids of their own for aria-activedescendant to point at.
const LISTBOX_ID = "command-bar-results";
const CONTACTS_LABEL_ID = `${LISTBOX_ID}-contacts-label`;
const TASKS_LABEL_ID = `${LISTBOX_ID}-tasks-label`;
const PROSPECTS_LABEL_ID = `${LISTBOX_ID}-prospects-label`;
// Prefixed by kind: a task id, a lead id and a prospect id are different
// namespaces, and an unprefixed collision would point aria-activedescendant at
// the wrong row.
type SelectionKind = "contact" | "task" | "prospect";
const optionId = (kind: SelectionKind, id: string) => `${LISTBOX_ID}-${kind}-${id}`;

// The three groups are rendered as separate blocks but indexed as ONE list, so
// arrow keys run continuously from the last contact into the first task, and
// from the last task into the first prospect, with no dead keypress at either
// seam. Render order below IS index order: contacts, tasks, prospects.
type Selection =
  | { kind: "contact"; lead: ContactLead }
  | { kind: "task"; task: TaskSearchResult }
  | { kind: "prospect"; prospect: ProspectSearchResult };

export function CommandBar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [contacts, setContacts] = useState<ContactLead[] | null>(null);
  const [tasks, setTasks] = useState<TaskSearchResult[] | null>(null);
  const [prospects, setProspects] = useState<ProspectSearchResult[] | null>(null);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedLead, setSelectedLead] = useState<ContactLead | null>(null);
  // Set only when the sheet was opened FROM a task result. ProfileSheet passes
  // it to TasksSection, which selects the matching Open/Completed tab and
  // scrolls that row into view. Null for a contact result, so the sheet opens
  // exactly as it always has.
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // All three sources refetch every time the palette opens, once — never per
  // keystroke. Ranking and filtering happen in the browser (Fuse, below), so
  // typing costs no round trips and there is no debounce or pagination to
  // reason about. Prospects deliberately follow the identical pattern contacts
  // and tasks already used rather than introducing a third fetch strategy.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    fetchSearchableContacts().then(setContacts);
    fetchSearchableTasks().then(setTasks);
    fetchSearchableProspects().then(setProspects);
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

  const contactFuse = useMemo(() => {
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

  // A separate index rather than one merged corpus: the two record shapes have
  // no fields in common, and a single Fuse instance would have to score a
  // task's title against a contact's email weighting. Two indexes also keep
  // each group's ranking independent, which is what the grouped layout implies.
  const taskFuse = useMemo(() => {
    if (!tasks) return null;
    return new Fuse(tasks, {
      keys: [
        { name: "title", weight: 2 },
        { name: "client_name", weight: 1 },
      ],
      threshold: 0.35,
    });
  }, [tasks]);

  // Its own index for the same reason tasks has one: a prospect's fields
  // (business name, town, category) do not line up with a contact's weighting,
  // and separate indexes keep each group's ranking independent.
  const prospectFuse = useMemo(() => {
    if (!prospects) return null;
    return new Fuse(prospects, {
      keys: [
        { name: "name", weight: 2 },
        { name: "city", weight: 1 },
        { name: "category", weight: 1 },
        { name: "phone", weight: 1 },
      ],
      threshold: 0.35,
    });
  }, [prospects]);

  const contactResults: ContactLead[] = query.trim()
    ? (contactFuse?.search(query).map((r) => r.item) ?? []).slice(0, MAX_RESULTS)
    : (contacts ?? []).slice(0, MAX_RESULTS);

  const taskResults: TaskSearchResult[] = query.trim()
    ? (taskFuse?.search(query).map((r) => r.item) ?? []).slice(0, MAX_RESULTS)
    : (tasks ?? []).slice(0, MAX_RESULTS);

  const prospectResults: ProspectSearchResult[] = query.trim()
    ? (prospectFuse?.search(query).map((r) => r.item) ?? []).slice(0, MAX_RESULTS)
    : (prospects ?? []).slice(0, MAX_RESULTS);

  const selections: Selection[] = [
    ...contactResults.map((lead): Selection => ({ kind: "contact", lead })),
    ...taskResults.map((task): Selection => ({ kind: "task", task })),
    ...prospectResults.map((prospect): Selection => ({ kind: "prospect", prospect })),
  ];

  const loading = contacts === null || tasks === null || prospects === null;

  function handleSelect(selection: Selection) {
    if (selection.kind === "contact") {
      setSelectedLead(selection.lead);
      setHighlightTaskId(null);
    } else if (selection.kind === "prospect") {
      // Prospects have no profile sheet — /prospects is a flat table with no
      // per-record detail view to open. So this navigates to the table and
      // names the row in the URL; the page reads ?highlight= and hands it to
      // ProspectsTable, which runs the SAME arrival-highlight hook the Tasks
      // group uses. A modal or a /prospects/<id> route would be inventing a
      // surface that does not exist yet.
      router.push(`/prospects?highlight=${encodeURIComponent(selection.prospect.id)}`);
    } else {
      // Both sources are already in memory and a task's lead is guaranteed to
      // be among the contacts — searchTasksForOrg excludes archived leads and
      // getAllContacts returns every non-archived one — so this resolves
      // locally with no extra round trip. Guarded anyway: if the two fetches
      // ever disagree, doing nothing beats opening a sheet for the wrong lead.
      const lead = contacts?.find((c) => c.id === selection.task.lead_id);
      if (!lead) return;
      setSelectedLead(lead);
      setHighlightTaskId(selection.task.id);
    }
    onClose();
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, selections.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selection = selections[activeIndex];
      if (selection) handleSelect(selection);
    }
  }

  function handleSheetClose() {
    setSelectedLead(null);
    setHighlightTaskId(null);
  }

  const active = selections[activeIndex];
  const activeOptionId = active
    ? active.kind === "contact"
      ? optionId("contact", active.lead.id)
      : active.kind === "task"
        ? optionId("task", active.task.id)
        : optionId("prospect", active.prospect.id)
    : undefined;

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
                  the same one HelpDrawer's search uses. */}
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
                    aria-activedescendant={activeOptionId}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActiveIndex(0);
                    }}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Search contacts, tasks, and prospects…"
                    aria-label="Search contacts, tasks, and prospects"
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
                aria-label="Contacts, tasks and prospects"
                className="max-h-80 overflow-y-auto p-2"
              >
                {loading ? (
                  <p className="text-body-md p-3 text-ink-muted">Loading…</p>
                ) : selections.length === 0 ? (
                  <p className="text-body-md p-3 text-ink-muted">
                    No contacts, tasks or prospects found.
                  </p>
                ) : (
                  <>
                    {/* Each group renders only when it has matches, so a
                        one-sided query never leaves a labelled empty header. */}
                    {contactResults.length > 0 && (
                      <div role="group" aria-labelledby={CONTACTS_LABEL_ID}>
                        <CommandGroupLabel id={CONTACTS_LABEL_ID}>Contacts</CommandGroupLabel>
                        {contactResults.map((lead, index) => (
                          <CommandResultItem
                            key={lead.id}
                            id={optionId("contact", lead.id)}
                            lead={lead}
                            active={index === activeIndex}
                            onSelect={() => handleSelect({ kind: "contact", lead })}
                            onHover={() => setActiveIndex(index)}
                          />
                        ))}
                      </div>
                    )}

                    {taskResults.length > 0 && (
                      <div role="group" aria-labelledby={TASKS_LABEL_ID}>
                        {/* The divider only exists between two populated
                            groups — a rule above the first group would read as
                            a stray line. */}
                        <div
                          className={
                            contactResults.length > 0 ? "mt-2 border-t border-hairline" : undefined
                          }
                        >
                          <CommandGroupLabel id={TASKS_LABEL_ID}>Tasks</CommandGroupLabel>
                        </div>
                        {taskResults.map((task, index) => (
                          <CommandTaskItem
                            key={task.id}
                            id={optionId("task", task.id)}
                            task={task}
                            active={contactResults.length + index === activeIndex}
                            onSelect={() => handleSelect({ kind: "task", task })}
                            onHover={() => setActiveIndex(contactResults.length + index)}
                          />
                        ))}
                      </div>
                    )}

                    {prospectResults.length > 0 && (
                      <div role="group" aria-labelledby={PROSPECTS_LABEL_ID}>
                        {/* Same rule as the Tasks divider: a rule exists only
                            between two populated groups, so it is suppressed
                            when nothing above this group rendered. */}
                        <div
                          className={
                            contactResults.length > 0 || taskResults.length > 0
                              ? "mt-2 border-t border-hairline"
                              : undefined
                          }
                        >
                          <CommandGroupLabel id={PROSPECTS_LABEL_ID}>Prospects</CommandGroupLabel>
                        </div>
                        {prospectResults.map((prospect, index) => {
                          // Prospects render last, so their offset is
                          // everything above them — one continuous index across
                          // all three groups.
                          const offset = contactResults.length + taskResults.length + index;
                          return (
                            <CommandProspectItem
                              key={prospect.id}
                              id={optionId("prospect", prospect.id)}
                              prospect={prospect}
                              active={offset === activeIndex}
                              onSelect={() => handleSelect({ kind: "prospect", prospect })}
                              onHover={() => setActiveIndex(offset)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </>
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
          onClose={handleSheetClose}
          highlightTaskId={highlightTaskId}
        />
      )}
    </>,
    document.body,
  );
}
