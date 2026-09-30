"use client";

import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  DEMO_BLOCK_CONTACT_URL,
  DEMO_BLOCK_LINK_TEXT,
  DEMO_BLOCK_PITCH,
  DEMO_BLOCK_TITLE,
} from "@/lib/demo/demo-block-message";

// What an error boundary shows instead of "Something went wrong" when the
// thrown error is a Demo Block (isDemoBlock). Nothing broke: the refusal is
// the demo working as designed, so the card says what the Guest can do next.
//
// One component for all three boundaries — root, (app) and pipeline — because
// a Demo Block can land in any of them. Each boundary keeps its own outer
// wrapper; this is only the card.
export function DemoBlockNotice({ reset }: { reset: () => void }) {
  return (
    <Card className="w-full max-w-sm p-6 text-center">
      <p className="text-base font-semibold">{DEMO_BLOCK_TITLE}</p>
      <p className="mt-2 text-sm text-ink-muted">{DEMO_BLOCK_PITCH}</p>
      <div className="mt-6 flex flex-col gap-2">
        <Button asChild variant="secondary" className="w-full">
          <a href={DEMO_BLOCK_CONTACT_URL}>{DEMO_BLOCK_LINK_TEXT}</a>
        </Button>
        <Button type="button" variant="ghost" onClick={reset} className="w-full">
          Back to the demo
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link href="/">Back to Today</Link>
        </Button>
      </div>
    </Card>
  );
}
