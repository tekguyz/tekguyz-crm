// Curated common values, not a full IANA/ISO catalog — broad enough to cover
// real customers without building a full i18n framework. Shared by the
// client-side <select> (OrgDetailsPanel) and the server action's own
// validation (organizations/actions.ts) so the two can never drift out of
// sync with each other.

export const TIMEZONES = [
  "UTC",
  // North America
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  // South America
  "America/Bogota",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/Santiago",
  // Europe
  "Europe/London",
  "Europe/Dublin",
  "Europe/Lisbon",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Rome",
  "Europe/Zurich",
  "Europe/Stockholm",
  "Europe/Oslo",
  "Europe/Copenhagen",
  "Europe/Warsaw",
  "Europe/Athens",
  "Europe/Istanbul",
  "Europe/Moscow",
  // Africa / Middle East
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Asia/Dubai",
  "Asia/Jerusalem",
  "Asia/Riyadh",
  // Asia
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Jakarta",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Taipei",
  "Asia/Seoul",
  "Asia/Tokyo",
  "Asia/Manila",
  // Oceania
  "Australia/Perth",
  "Australia/Adelaide",
  "Australia/Sydney",
  "Australia/Brisbane",
  "Pacific/Auckland",
];

export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "NZD",
  "JPY",
  "CNY",
  "HKD",
  "SGD",
  "INR",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "MXN",
  "BRL",
  "ZAR",
  "AED",
  "ILS",
  "KRW",
  "THB",
  "IDR",
  "PHP",
];

// Presentation only. The stored value stays the IANA identifier — every zone
// in TIMEZONES above is validated by organizations/actions.ts against that
// exact string, and this label never reaches a form value or the database.
//
// An IANA id is a path with underscores for spaces ("America/New_York"), which
// is a machine identifier being shown to a human. The last segment is the city
// the operator is actually picking, so that is what renders. Checked against
// the curated list above: all 55 entries have a distinct final segment, so a
// bare city name is never ambiguous. If a zone is ever added whose city name
// collides with one already there, this has to carry the region again.
export function timezoneLabel(timezone: string): string {
  const segments = timezone.split("/");
  return segments[segments.length - 1].replaceAll("_", " ");
}
