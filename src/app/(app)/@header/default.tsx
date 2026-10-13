// A path no @header page matches (a hard load of a 404, say) gets an empty
// strip rather than a wrong title. Every real route has its own page here.
export default function DefaultHeader() {
  return null;
}
