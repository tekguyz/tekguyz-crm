"use client";

import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DEMO_READ_ONLY_BODY, DEMO_READ_ONLY_TITLE } from "@/lib/demo/read-only-refusal";

// What an error boundary shows instead of "Something went wrong" when the
// thrown error is a refused write in the public demo (isDemoReadOnlyRefusal).
// The header's DemoModeBadge warns before the click; this answers the click.
//
// One component for all three boundaries — root, (app) and pipeline — because
// a refused write can land in any of them: a task control inside the profile
// sheet throws from the layout and reaches the ROOT boundary. Each boundary
// keeps its own outer wrapper; this is only the card.
//
// The copy says nothing broke, because nothing did: the refusal is the demo
// working as designed.
export function DemoReadOnlyNotice({ reset }: { reset: () => void }) {
  return (
    <Card className="w-full max-w-sm p-6 text-center">
      <p className="text-base font-semibold">{DEMO_READ_ONLY_TITLE}</p>
      <p className="mt-2 text-sm text-ink-muted">{DEMO_READ_ONLY_BODY}</p>
      <div className="mt-6 flex flex-col gap-2">
        <Button type="button" variant="secondary" onClick={reset} className="w-full">
          Back to the demo
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link href="/">Back to Today</Link>
        </Button>
      </div>
    </Card>
  );
}
