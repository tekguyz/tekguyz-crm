import { notFound } from "next/navigation";

import { FakeContent } from "../preview/FakeContent";
import { PHONE_TAB_BAR_OVERRIDE } from "../preview/frames";
import {
  DesktopFrame,
  PhoneFrame,
  VariantPage,
} from "../preview/PreviewSurface";
import { DisclosureHeader } from "./DisclosureHeader";
import { DisclosureSidebar } from "./DisclosureSidebar";
import { DisclosureTabBar } from "./DisclosureTabBar";

const USER = { displayName: "Alejandro Ruiz", userEmail: "admin@tekguyz.com" };

export default function DisclosureVariantPage() {
  // Repeated from the layout on purpose — see layout.tsx. A layout that
  // throws does not stop its page rendering, so this is the check that keeps
  // the comp markup out of the production build entirely.
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <VariantPage
      name="Variant B — Disclosure"
      thesis="The Plan CRM reference, adapted. Groups are real collapsible sections; the one holding the current route starts open and the rest start closed, so the rail shows four rows instead of seven. Parents are buttons, never links — we have no route behind Work or Prospecting and will not invent one. Collapsed, the disclosure is dropped rather than shrunk. The header spends its width on the search trigger and reduces identity to avatar-and-chevron. The phone bar gives the active destination a labelled pill and takes the labels off the other three."
    >
      <DesktopFrame label="Desktop — Prospecting open, Work closed">
        <DisclosureSidebar collapsed={false} activeHref="/prospects" />
        <div className="flex min-w-0 flex-1 flex-col">
          <DisclosureHeader {...USER} isDemo />
          <div className="flex-1 overflow-y-auto p-4">
            <FakeContent title="Prospects" />
          </div>
        </div>
      </DesktopFrame>

      <DesktopFrame label="Desktop — Work open (default route), collapsed rail beside it">
        <DisclosureSidebar collapsed={false} activeHref="/" />
        <DisclosureSidebar collapsed activeHref="/" />
        <div className="flex min-w-0 flex-1 flex-col">
          <DisclosureHeader {...USER} />
          <div className="flex-1 overflow-y-auto p-4">
            <FakeContent title="Today" />
          </div>
        </div>
      </DesktopFrame>

      <PhoneFrame label="Mobile — 375px, Contacts active">
        <div className="h-full overflow-y-auto p-4 pb-24">
          <FakeContent title="Contacts" />
        </div>
        <DisclosureTabBar activeHref="/contacts" className={PHONE_TAB_BAR_OVERRIDE} />
      </PhoneFrame>
    </VariantPage>
  );
}
