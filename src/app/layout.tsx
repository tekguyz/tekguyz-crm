import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { BRAND } from "@/lib/brand/copy";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// No `openGraph.images` entry here on purpose. The opengraph-image.tsx file
// convention wires that up automatically; a manual entry overrides and breaks
// it.
export const metadata: Metadata = {
  // Without this, Next resolves the opengraph-image URL against
  // http://localhost:3000 and every shared link ships a dead card image — a
  // build warning, not an error, so it would pass unnoticed. Reuses
  // NEXT_PUBLIC_APP_URL, this app's single public-origin var; do not add a
  // second one (see src/lib/env/validate-env.ts).
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: BRAND.name,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  // Supplies og:url, which Vercel's inspector flags as missing without it.
  // Relative, so it resolves against metadataBase and stays correct in
  // preview deployments instead of hardcoding the production host.
  alternates: { canonical: "/" },
  // This is a login-gated internal tool, not a marketing site. There is
  // nothing here for a search engine to index — every route redirects an
  // anonymous visitor to /login — and an indexed login page is noise at best.
  // Note this does NOT affect link previews: Slack, Facebook and iMessage
  // read the OG tags directly and do not apply robots rules to an unfurl.
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/icons/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/icons/apple-touch-icon-180.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: BRAND.name,
    title: BRAND.name,
    description: BRAND.description,
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.name,
    description: BRAND.description,
  },
};

// Theme colour flips with the app's two themes — a single value leaves one
// theme's browser chrome mismatched against the canvas.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1A1D" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The font variable must live on <html>, not <body>. Tailwind's preflight
  // applies font-family: var(--font-sans) at the html level, and --font-sans
  // resolves to var(--font-inter) — so declaring --font-inter on <body> puts it
  // out of reach and the whole app silently falls back to the system stack,
  // with no error anywhere.
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
