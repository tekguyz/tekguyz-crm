// A 0–1 ratio as the whole-number percentage /reports prints. One copy, shared
// by the page and the aggregate CSV export, so the file can never round a win
// rate differently from the figure a human is reading on screen.
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
