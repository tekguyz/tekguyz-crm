// The quick due dates offered under a datetime-local field: Today, Tomorrow,
// +3 days, +1 week. Pure on purpose, so the rules are one unit test and not a
// click-through.
//
// Everything is the operator's LOCAL wall clock, because that is what the
// datetime-local input speaks. The caller turns the Date into the input's
// string; this module does not format anything, so there is one conversion in
// the app (toDatetimeLocalValue) and not two.
export type DuePreset = "today" | "tomorrow" | "in3days" | "inWeek";

export const DUE_PRESETS: { id: DuePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "in3days", label: "+3 days" },
  { id: "inWeek", label: "+1 week" },
];

const DAYS_AHEAD: Record<Exclude<DuePreset, "today">, number> = {
  tomorrow: 1,
  in3days: 3,
  inWeek: 7,
};

// Future days land at 9:00, the same hour a new task already defaults to.
// "Today" is 5 PM; once 5 PM has passed it is 11:59 PM, so the chip never
// hands back a time that is already late.
export function dueForPreset(preset: DuePreset, now: Date = new Date()): Date {
  const due = new Date(now);
  if (preset === "today") {
    due.setHours(17, 0, 0, 0);
    if (due.getTime() <= now.getTime()) due.setHours(23, 59, 0, 0);
    return due;
  }
  due.setDate(due.getDate() + DAYS_AHEAD[preset]);
  due.setHours(9, 0, 0, 0);
  return due;
}
