"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { useHelp } from "@/components/help/HelpContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Inline "what is this?" affordance: a short blurb in a popover, plus a
// "Learn more" that opens the one shared HelpDrawer scrolled to the full
// topic. Opens on hover and on click/focus, so it's reachable by keyboard
// and on touch, where hover doesn't exist.
export function HelpTooltip({ topicId, blurb }: { topicId: string; blurb: string }) {
  const { openHelp } = useHelp();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="What's this?"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-ink-main"
        >
          <HelpCircle className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        // Keeps the popover usable with the mouse — without this it closes
        // the moment the pointer leaves the small trigger icon.
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        // Hover-opened popovers steal focus on open by default, which yanks
        // the caret out of whatever field the user is typing in.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="text-sm text-ink-muted">{blurb}</p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            openHelp(topicId);
          }}
          className="mt-2 text-sm font-medium text-accent hover:underline"
        >
          Learn more
        </button>
      </PopoverContent>
    </Popover>
  );
}
