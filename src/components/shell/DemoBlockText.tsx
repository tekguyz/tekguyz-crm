import {
  DEMO_BLOCK_CONTACT_URL,
  DEMO_BLOCK_LINK_TEXT,
  DEMO_BLOCK_MESSAGE,
  DEMO_BLOCK_PITCH,
  DEMO_BLOCK_TITLE,
} from "@/lib/demo/demo-block-message";

// An action that returns its error as text hands the Demo Block over as
// DEMO_BLOCK_MESSAGE. Plain text cannot carry a link, so this swaps that one
// string for the same words plus the "Talk to TEKGUYZ →" link. Any other
// message passes through untouched. Works inside a <p> and inside a toast.
export function DemoBlockText({ message }: { message: string }) {
  if (message !== DEMO_BLOCK_MESSAGE) return <>{message}</>;
  return (
    <>
      {DEMO_BLOCK_TITLE} {DEMO_BLOCK_PITCH}{" "}
      <a href={DEMO_BLOCK_CONTACT_URL} className="font-medium underline">
        {DEMO_BLOCK_LINK_TEXT}
      </a>
    </>
  );
}
