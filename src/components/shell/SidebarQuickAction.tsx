import { CreateLeadModal } from "@/components/leads/CreateLeadModal";

export function SidebarQuickAction() {
  return (
    <div className="border-t border-hairline p-2">
      <CreateLeadModal />
    </div>
  );
}
