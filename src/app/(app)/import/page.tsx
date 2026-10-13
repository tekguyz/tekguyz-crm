import type { Metadata } from "next";

import { ImportWizardLayout } from "@/components/import/ImportWizardLayout";

export const metadata: Metadata = { title: "Import" };

export default function ImportPage() {
  return <ImportWizardLayout />;
}
