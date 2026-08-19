"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconX } from "@tabler/icons-react";

import { dismissTask } from "@/lib/tasks/actions";
import { Button } from "@/components/ui/Button";

// The only client-side island in TasksDueQueue, which stays a server
// component. It is a sibling of the row's <Link>, never a child of it — a
// button nested inside an anchor is invalid HTML and its click would race the
// navigation.
//
// Dismiss only, no edit: an agenda row is a one-line worklist entry, and its
// existing ?leadId= deep link already opens the profile sheet where the full
// edit form lives. Duplicating that form here would be a second editing
// surface for the same row.
export function TaskDismissButton({ taskId, title }: { taskId: string; title: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      aria-label={`Dismiss ${title}`}
      onClick={() => {
        startTransition(async () => {
          await dismissTask(taskId);
          // The action revalidates on the server; this re-renders the RSC
          // payload so the dismissed row leaves the list without a reload.
          router.refresh();
        });
      }}
    >
      <IconX size={16} stroke={1.5} />
    </Button>
  );
}
