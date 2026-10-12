"use client";

import { useId, useState } from "react";
import { IconChevronRight } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

// A WEBHOOK activity entry stores the whole inbound body as one JSON string.
// The same enquiry is already written out, readable, in Enquiry history, so
// printing the JSON here too doubled the noise. The entry says what happened
// in a sentence and keeps the raw payload one click away, because it is still
// the evidence when an integration misbehaves.
//
// Pretty-printed when the content parses, shown as stored when it does not: an
// old or hand-made entry must still be readable, not thrown away.
function prettyPayload(content: string): string {
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
}

export function WebhookPayload({ content }: { content: string }) {
  const [shown, setShown] = useState(false);
  const panelId = useId();

  return (
    <div>
      <p className="text-body-md text-ink-main">Enquiry received through the webhook.</p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={shown}
        aria-controls={panelId}
        onClick={() => setShown((current) => !current)}
        className="-ml-2 max-sm:h-11"
      >
        <IconChevronRight
          aria-hidden
          stroke={1.75}
          className={cn("size-4 shrink-0 transition-transform", shown && "rotate-90")}
        />
        {shown ? "Hide payload" : "Show payload"}
      </Button>
      {/* break-all: a pasted URL or token in the payload has nothing to wrap
          on and pushed a horizontal scrollbar across the sheet body before. */}
      <pre
        id={panelId}
        hidden={!shown}
        className="text-caption mt-1 rounded-md border border-hairline bg-canvas-soft p-2 break-all whitespace-pre-wrap text-ink-main"
      >
        {prettyPayload(content)}
      </pre>
    </div>
  );
}
