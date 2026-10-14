import { ChannelIcon } from "@/components/leads/ChannelIcon";
import { Button } from "@/components/ui/Button";
import { channelLinks, type ChannelLinkKind } from "@/lib/leads/channel-links";
import type { Lead } from "@/lib/leads/queries";
import { cn } from "@/lib/utils/cn";

// The channels a phone row keeps. The rest (website, socials, map) are one
// tap away in the lead's panel header; on a 375px row they would push the
// call/text/email targets below 44px or onto a third line.
const PHONE_CHANNELS = new Set<ChannelLinkKind>(["call", "text", "email", "whatsapp"]);

// One icon link per Contact Channel the lead has. Shared by the Contacts row
// (both widths) and the lead table's Channels column (lg and up), so the two
// can never disagree. Each link is `relative z-10` so it sits above a row's
// stretched open button, beside it and never inside it.
export function ChannelLinks({ lead }: { lead: Lead }) {
  return (
    <>
      {channelLinks(lead).map((link) => (
        <Button
          key={link.kind}
          asChild
          variant="ghost"
          size="sm"
          className={cn(
            "relative z-10 size-11 justify-center px-0 lg:size-8",
            !PHONE_CHANNELS.has(link.kind) && "hidden lg:inline-flex",
          )}
        >
          <a
            href={link.href}
            aria-label={`${link.label} ${lead.client_name}`}
            title={link.label}
            {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            <ChannelIcon kind={link.kind} className="size-[1.125rem] lg:size-4" />
          </a>
        </Button>
      ))}
    </>
  );
}
