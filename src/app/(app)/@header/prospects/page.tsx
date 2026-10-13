import Link from "next/link";
import { Suspense } from "react";
import { IconUpload } from "@tabler/icons-react";

import { HeaderCount, HeaderCountSkeleton, PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { getCurrentOrg } from "@/lib/organizations/current";
import { getProspects } from "@/lib/prospects/queries";

type SearchParams = Promise<{ archived?: string }>;

// The same call the page makes, argument for argument, so cache() serves both
// from one query. The table's own "6 of 6" beside its search is the filtered
// count; this is the tab's.
async function ProspectsCount({ searchParams }: { searchParams: SearchParams }) {
  const { archived } = await searchParams;
  const { orgId } = await getCurrentOrg();
  const prospects = await getProspects(orgId, archived === "true");
  return (
    <HeaderCount n={prospects.length} noun={prospects.length === 1 ? "prospect" : "prospects"} />
  );
}

// Import CSV is the page's action: loading a list is how prospects arrive.
export default function ProspectsHeader({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageHeader
      href="/prospects"
      count={
        <Suspense fallback={<HeaderCountSkeleton />}>
          <ProspectsCount searchParams={searchParams} />
        </Suspense>
      }
      actions={
        <Button asChild variant="primary" className="max-sm:size-11 max-sm:px-0">
          <Link href="/prospects/import">
            <IconUpload aria-hidden="true" className="size-4" stroke={1.75} />
            <span className="max-sm:sr-only">Import CSV</span>
          </Link>
        </Button>
      }
    />
  );
}
