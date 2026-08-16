"use client";

import { useState } from "react";
import { IconCopy, IconCheck } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";

// Same shape as the CopyButton primitive (ghost, sm, 1500ms reset) but kept
// separate because the URL is built from window.location.origin, which only
// exists in the click handler — passing it as a render-time `text` prop would
// mean computing it during render and mismatching on hydration.
export function CopyInviteLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="shrink-0"
      onClick={async () => {
        const url = `${window.location.origin}/invite/${token}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? (
        <IconCheck className="size-4" stroke={1.75} />
      ) : (
        <IconCopy className="size-4" stroke={1.75} />
      )}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
