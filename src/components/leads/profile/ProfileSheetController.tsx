"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchLeadById } from "@/lib/leads/actions";
import type { Lead } from "@/lib/leads/queries";
import { ProfileSheet } from "@/components/leads/profile/ProfileSheet";

// Mounted once in AppShell — reads ?leadId= from the URL and opens the
// profile sheet for it. This is what makes a Resend notification email's
// deep link (https://.../?leadId=<id>) actually land on the right lead,
// rather than just opening the app's homepage.
export function ProfileSheetController() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");
  const [lead, setLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (!leadId) {
      setLead(null);
      return;
    }

    let cancelled = false;
    fetchLeadById(leadId).then((result) => {
      if (!cancelled) setLead(result);
    });

    return () => {
      cancelled = true;
    };
  }, [leadId]);

  function handleClose() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("leadId");
    const query = params.toString();
    router.replace(query ? `?${query}` : window.location.pathname);
  }

  if (!leadId || !lead) return null;

  return <ProfileSheet lead={lead} open onClose={handleClose} />;
}
