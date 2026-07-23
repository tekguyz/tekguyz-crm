// Single source of truth for every literal Gemini model id used in this app.
// Previously each caller (spam-shield.ts, audio-transcription.ts,
// generate-executive-narrative.ts) hardcoded its own string, and this build
// has already had model ids go stale mid-project multiple times (Prompt 13:
// 3.1-flash-lite -> 3.5-flash-lite; roadmap's "gemini-3.1-pro" was never a
// real id, corrected to 3.1-pro-preview in Prompt 14). A model update is now
// a one-file change instead of a codebase-wide grep.
//
// All three re-verified live against ai.google.dev's model docs and Google's
// own release/changelog posts on 2026-07-22 (this prompt's run), not carried
// forward from each constant's own original prompt — see the Prompt 15a
// addendum in CLAUDE.md for the sources checked.

// Spam Shield's binary lead classification (spam-shield.ts). GA, unaffected
// by the temperature/top_p/top_k deprecation that shipped 2026-07-21 (that
// change is scoped to Gemini 3.6 Flash and 3.5 Flash-Lite specifically, not
// plain 3.5 Flash) — safe to keep passing `temperature` here.
export const GEMINI_SPAM_SHIELD_MODEL = "gemini-3.5-flash";

// Voice-memo transcription (audio-transcription.ts). Confirmed still current
// — Google's own GA announcement for this exact id landed 2026-07-21, one
// day before this verification. Does NOT pass temperature/top_p/top_k today;
// if that ever changes, note this model is one of the two explicitly
// affected by the new sampling-parameter deprecation.
export const GEMINI_TRANSCRIPTION_MODEL = "gemini-3.5-flash-lite";

// Weekly executive narrative generation (generate-executive-narrative.ts).
// Confirmed still the correct callable id — multiple independent sources
// (OpenRouter, artificialanalysis.ai, getdeploying.com, pricepertoken.com)
// agree on this exact string as of 2026-07-22. Still preview-tier, not GA;
// re-check this one first if a future prompt reports it erroring.
export const GEMINI_REPORT_MODEL = "gemini-3.1-pro-preview";
