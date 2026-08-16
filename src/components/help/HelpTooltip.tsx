"use client";

import { useState } from "react";
import { IconHelpCircle } from "@tabler/icons-react";
import { useHelp } from "@/components/help/HelpContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/Button";

// Inline "what is this?" affordance: a short blurb in a popover, plus a
// "Learn more" that opens the one shared HelpDrawer scrolled to the full
// topic. Opens on hover and on click/focus, so it's reachable by keyboard
// and on touch, where hover doesn't exist.
//
// The trigger collapses Button's md size down to the 16px glyph that sits
// inline in a field label — same "squares off Button for an icon-only
// control" move as ThemeToggle/HelpTrigger, one size smaller. It stays a
// Button so the ghost hover and the shared focus ring come from the
// primitive rather than a hand-tuned colour.
export function HelpTooltip({ topicId, blurb }: { topicId: string; blurb: string }) {
  const { openHelp } = useHelp();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label="What's this?"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          className="size-4 shrink-0 gap-0 rounded-full p-0"
        >
          <IconHelpCircle className="size-4" stroke={1.75} />
        </Button>
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
        <p className="text-body-md text-ink-muted">{blurb}</p>
        {/* v1 styled this as an accent text link. Under v2 the popover already
            carries the emphasis, so the action inside it is a plain Level 0
            control — no --accent, no hand-rolled underline. */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={() => {
            setOpen(false);
            openHelp(topicId);
          }}
        >
          Learn more
        </Button>
      </PopoverContent>
    </Popover>
  );
}
