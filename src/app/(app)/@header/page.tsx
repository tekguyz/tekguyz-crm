import { PageHeader } from "@/components/shell/PageHeader";
import { CreateLeadDrawer } from "@/components/leads/CreateLeadDrawer";

// Today has no single record list, so no count: its queues count themselves.
export default function TodayHeader() {
  return <PageHeader href="/" actions={<CreateLeadDrawer />} />;
}
