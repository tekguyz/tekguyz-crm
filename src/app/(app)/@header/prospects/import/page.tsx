import { PageHeader } from "@/components/shell/PageHeader";

// Names itself, with Prospects as the way back: it used to read "Prospects",
// which was the screen you had just left.
export default function ProspectImportHeader() {
  return <PageHeader href="/prospects" title="Import prospects" parent />;
}
