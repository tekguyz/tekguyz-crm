import ReactMarkdown from "react-markdown";

export function ExecutiveBrief({ brief }: { brief: string | null }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Executive Brief
      </h3>
      {brief ? (
        <div className="space-y-2 text-sm text-ink-main [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_strong]:font-semibold [&_ul]:list-disc">
          <ReactMarkdown>{brief}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">No AI brief generated yet.</p>
      )}
    </section>
  );
}
