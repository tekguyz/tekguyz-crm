// The tekguyz.com contact page's own words: field placeholders and the /contact
// hero copy. Automated form-fillers read these off the page and submit them as
// if a visitor typed them. The Spam Shield model then reads that boilerplate as
// bot-like and flags a real enquiry (#6). Remove it before the model scores.
//
// SOURCE OF TRUTH: tekguyz-site/lib/validation.ts (UI_COPY), with the
// placeholders in tekguyz-site/content/solutions.ts. This is a copy, so it can
// drift. When the site's contact copy changes, change this list too.
// This only removes copy. It never decides a verdict, never sets `archived`,
// and never gates the notification.

const SITE_COPY: readonly string[] = [
  // detailsPlaceholder + DEFAULT_DETAILS_PLACEHOLDER (the message textarea).
  "What's getting done by hand right now that shouldn't be?",
  "Roughly how many calls are you missing after hours?",
  "What are you using instead right now — spreadsheets, email, something else?",
  "Describe the workflow you want a tool for.",
  "Tell us what you're trying to fix or build.",
  // Field placeholders.
  "Your name",
  "you@company.com",
  "Company name",
  "(xxx) xxx-xxxx",
  "yoursite.com",
  "Select one",
  // /contact hero subhead and meta description.
  "Tell us what you're working with and what you're trying to fix. We'll take it from there.",
  "Tell us what you're working with and what you're trying to fix. Free conversation, flat quote, no surprises — we reply within one business day.",
];

// Short entries ("Select one") sit inside real sentences, so they match only
// when they are the whole value. Long entries are safe to remove anywhere.
const CONTAINMENT_MIN = 40;

function normalize(v: string): string {
  return v
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const NORMALIZED = SITE_COPY.map(normalize);

// Matches an entry as it appears in a submitted value: whitespace runs are
// interchangeable, and quotes and dashes match their typographic variants.
function patternFor(entry: string): RegExp {
  const body = entry
    .split("")
    .map((ch) => {
      if (/\s/.test(ch)) return "\\s+";
      if (/['‘’ʼ]/.test(ch)) return "['‘’ʼ]";
      if (/["“”]/.test(ch)) return '["“”]';
      if (/[-‐-―]/.test(ch)) return "[-‐-―]";
      return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("")
    // The closing period is often dropped.
    .replace(/\\\.$/, "\\.?");
  return new RegExp(body, "gi");
}

const LONG_PATTERNS = SITE_COPY.filter((c) => normalize(c).length >= CONTAINMENT_MIN).map(patternFor);

function isWholeSiteCopy(value: string): boolean {
  const n = normalize(value);
  return n !== "" && NORMALIZED.includes(n);
}

// Returns what the visitor wrote. Usually nothing when the value was page copy.
export function stripSiteCopy(raw: string): string {
  let value = raw;
  for (const pattern of LONG_PATTERNS) value = value.replace(pattern, " ");
  value = value.replace(/[ \t]+\n/g, "\n").trim();
  return isWholeSiteCopy(value) ? "" : value;
}
