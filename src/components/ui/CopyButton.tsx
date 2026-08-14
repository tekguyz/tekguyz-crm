"use client";

import { useState } from "react";
import { IconCopy, IconCheck } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";

// Composes the v2 Button primitive instead of restating its classes. Ghost is
// the right variant here: this always sits beside the value it copies, so it is
// a secondary affordance rather than the surface's own action.
//
// The 1500ms reset and the `text` prop are unchanged — the label flips to
// "Copied" long enough to read and then returns, with no toast and no layout
// shift, which is why the timer is inline rather than a shared notification.
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="shrink-0"
      onClick={async () => {
        // writeText rejects on any non-secure origin, without transient user
        // activation, and under some browser clipboard policies. Before this
        // try/catch, that rejection skipped setCopied entirely, so the button
        // just sat there looking broken with nothing logged anywhere. Confirmed
        // live: it rejects with NotAllowedError even when the Permissions API
        // reports clipboard-write as "granted".
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Couldn't copy — copy it manually instead.");
        }
      }}
    >
      {copied ? (
        <IconCheck className="size-4" stroke={1.75} />
      ) : (
        <IconCopy className="size-4" stroke={1.75} />
      )}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
