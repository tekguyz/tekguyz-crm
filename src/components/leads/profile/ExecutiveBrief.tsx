import ReactMarkdown from "react-markdown";

// `text-label uppercase` is the v2 section-header role, shared verbatim by
// TasksSection and ActivityTimeline so the three sheet sections read as one
// stack.
export function ExecutiveBrief({ brief }: { brief: string | null }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-label uppercase text-ink-muted">Executive Brief</h3>
      {brief ? (
        <div className="text-body-md space-y-2 text-ink-main [&_h1]:text-h2 [&_h2]:text-title [&_li]:ml-4 [&_ol]:list-decimal [&_strong]:font-semibold [&_ul]:list-disc">
          <ReactMarkdown>{brief}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-body-md text-ink-muted">No AI brief generated yet.</p>
      )}
    </section>
  );
}
