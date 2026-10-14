// Which modifier the person's keyboard has, decided on the server so the
// search keycap never flashes from one label to the other after hydration
// (#66). The ⌘K / Ctrl-K listener in ShellContext accepts both either way;
// this only picks the words printed on the keycap.
//
// sec-ch-ua-platform is the clean signal (Chromium sends it, quoted:
// "macOS"). Safari and Firefox do not, so the user agent is the fallback.
// When neither says, the answer is "not Apple": most people who reach this
// CRM from an unknown browser are on Windows.
export function isApplePlatform(platformHint: string | null, userAgent: string | null): boolean {
  const hint = platformHint?.replaceAll('"', "").trim();
  if (hint) return hint === "macOS" || hint === "iOS";
  return /Macintosh|Mac OS X|iPhone|iPad|iPod/.test(userAgent ?? "");
}

export function shortcutLabel(apple: boolean): "⌘K" | "Ctrl K" {
  return apple ? "⌘K" : "Ctrl K";
}
