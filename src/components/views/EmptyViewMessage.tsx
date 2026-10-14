import Link from "next/link";

import { filterCount, resetFiltersHref, type LeadView, type ViewPage } from "@/lib/views/params";

// The empty message of a lead list, plus a way back when it is empty only
// because a filter hides everything (#68). "No contacts are assigned to you."
// used to be a dead end. With no filter on, it is just the text. "Show all"
// clears the filters only: the sort and the Board / Table layout stay. On the
// archived Contacts view that lands on the ACTIVE list, so it says "Show active".
export function EmptyViewMessage({ page, view, text }: { page: ViewPage; view: LeadView; text: string }) {
  if (filterCount(page, view) === 0) return <>{text}</>;
  return (
    <>
      {text}{" "}
      <Link href={resetFiltersHref(page, view)} className="text-accent underline underline-offset-2">
        {page === "contacts" && view.archived ? "Show active" : "Show all"}
      </Link>
    </>
  );
}
