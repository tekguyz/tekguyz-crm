import { Button } from "@/components/ui/Button";
import { leaveDemo } from "@/lib/demo/start-demo";

// The demo banner (#29, #31). Shown on every screen of a Demo Org, so a Guest
// always knows this is not a real account, where it came from, and how to
// leave. It replaced the header's "Read-only" badge: the demo can write now,
// so what a Guest needs told is "this is the demo", not "nothing saves".
//
// A full-width strip above the header, not a badge inside it, so it holds at
// every width: the sidebar is collapsed or absent on a phone, and a shared
// link gets a lot of phone traffic. It wraps rather than truncates.
//
// aside[aria-label='Demo'] is a contract, not a style choice: the showcase
// screenshot scripts in the other apps find the banner by that selector.
//
// Neutral, not orange or accent. Being in the demo is a standing condition,
// not an alert, and colour here is signal (DESIGN.md).
export function DemoBanner() {
  return (
    <aside
      aria-label="Demo"
      className="text-body-sm flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-hairline bg-canvas-soft px-4 py-1.5"
    >
      <p className="font-medium">You&apos;re in the demo</p>
      <div className="flex items-center gap-3">
        <a href="https://tekguyz.com" className="text-accent underline underline-offset-2">
          Built by TEKGUYZ
        </a>
        {/* A form post, never a link: leaving signs out, and a GET that signs
            out is a GET a prefetch can fire. */}
        <form action={leaveDemo}>
          <Button type="submit" variant="ghost" size="sm">
            Leave the demo
          </Button>
        </form>
      </div>
    </aside>
  );
}
