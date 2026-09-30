// Sample Data: follow-up tasks. Moved here from scripts/seed/lib/demo-tasks.ts
// (#31). A plain module — see sample-leads.ts for why.
//
// Synthetic follow-up tasks for the demo org, so Agenda, Today and the
// calendar have something to render. Added 2026-09-04: the demo org seeded
// leads, activity_logs and prospects but never any tasks, so a visitor
// arriving through the public /demo link saw three empty views and read them
// as unfinished features rather than empty states.
//
// Deliberately spread across overdue / today / upcoming, because that spread
// is what actually exercises the UI: an overdue task is what drives the
// Going Cold SLA styling, and a mix is what makes the agenda look like a real
// working day rather than a list.
//
// Every title is transparently about a seeded, invented company — same
// fiction rules as sample-leads.ts and sample-prospects.ts. Nothing here refers to
// a real person or a real engagement.

export type DemoTask = {
  // Which lead this hangs off, by its position in DEMO_LEADS
  // (sample-leads.ts). Positional rather than by name so a renamed lead cannot
  // silently orphan a task; buildSampleData drops a task whose index is gone.
  leadIndex: number;
  title: string;
  description: string | null;
  // Days from now. Negative is overdue, 0 is today, positive is upcoming.
  dueInDays: number;
  hour: number;
  completed: boolean;
};

export const DEMO_TASKS: DemoTask[] = [
  {
    leadIndex: 0,
    title: "Send revised roofing quote",
    description: "They asked for the tear-off line itemised separately.",
    dueInDays: -3,
    hour: 9,
    completed: false,
  },
  {
    leadIndex: 1,
    title: "Chase solar site-survey date",
    description: "Second attempt — no reply to the first email.",
    dueInDays: -1,
    hour: 14,
    completed: false,
  },
  {
    leadIndex: 2,
    title: "Call back about the detailing package",
    description: null,
    dueInDays: 0,
    hour: 11,
    completed: false,
  },
  {
    leadIndex: 3,
    title: "Confirm landscaping start date",
    description: "Crew availability confirmed for the week after next.",
    dueInDays: 0,
    hour: 16,
    completed: false,
  },
  {
    leadIndex: 4,
    title: "Prepare maintenance contract draft",
    description: "Annual, quarterly visits, use the standard terms.",
    dueInDays: 2,
    hour: 10,
    completed: false,
  },
  {
    leadIndex: 5,
    title: "Follow up on the deposit invoice",
    description: null,
    dueInDays: 5,
    hour: 9,
    completed: false,
  },
  {
    leadIndex: 0,
    title: "Log the initial site photos",
    description: "Uploaded to the shared drive.",
    dueInDays: -6,
    hour: 15,
    completed: true,
  },
  {
    leadIndex: 2,
    title: "Send the intro pack",
    description: null,
    dueInDays: -4,
    hour: 13,
    completed: true,
  },
];

