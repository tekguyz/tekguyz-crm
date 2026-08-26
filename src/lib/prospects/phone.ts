// The TypeScript twin of prospects.phone_digits' generated expression and of
// the leads-side normalization inside import_prospects_chunk
// (20260826120000_prospects.sql). All three must agree.
//
// It exists so the client can show "this number already belongs to a lead"
// counts without a round trip, and so the rule is unit-testable without a
// database. The database remains the source of truth: nothing here is trusted
// on write — the stored column is GENERATED and the hint is computed inside
// the RPC.
//
// NULL/null means "not comparable", not "no digits". A fragment shorter than
// ten digits is dropped rather than kept, because a 7-digit local number would
// false-match every number ending in those same 7 digits. Ten digits is the
// NANP subscriber number, and taking the LAST ten also strips a leading 1 or
// +1 country code — so "1-954-555-1234", "(954) 555-1234" and "9545551234"
// all normalize to "9545551234".
export function normalizePhoneDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}
