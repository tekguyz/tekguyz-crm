"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyInviteLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        const url = `${window.location.origin}/invite/${token}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-1 rounded-md border border-hairline px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-canvas-soft hover:text-ink-main"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
