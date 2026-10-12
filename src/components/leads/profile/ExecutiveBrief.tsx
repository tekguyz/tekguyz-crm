import ReactMarkdown from "react-markdown";
import { IconSparkles } from "@tabler/icons-react";
import { PanelSectionHeading } from "@/components/leads/profile/PanelSectionHeading";

// Markdown drops a single newline: it joins the two lines into one paragraph.
// A Lead Pack brief is a Day 0 message written line by line (#37), so every
// single newline becomes a hard break (two trailing spaces, CommonMark's own
// syntax). A blank line still starts a new paragraph, and a list still starts
// a list, because a list may interrupt a paragraph. Windows line endings from
// a CSV saved in Excel are made plain \n first.
const keepLineBreaks = (text: string) =>
  text.replace(/\r\n?/g, "\n").replace(/(?<!\n)\n(?!\n)/g, "  \n");

// PanelSectionHeading is shared by every block in the panel so they read as
// one stack.
export function ExecutiveBrief({ brief }: { brief: string | null }) {
  return (
    <section className="flex flex-col gap-2">
      <PanelSectionHeading icon={IconSparkles} tone="purple">
        Executive Brief
      </PanelSectionHeading>
      {brief ? (
        <div className="text-body-md space-y-2 text-ink-main [&_h1]:text-h2 [&_h2]:text-title [&_li]:ml-4 [&_ol]:list-decimal [&_strong]:font-semibold [&_ul]:list-disc">
          <ReactMarkdown>{keepLineBreaks(brief)}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-body-md text-ink-muted">No AI brief generated yet.</p>
      )}
    </section>
  );
}
