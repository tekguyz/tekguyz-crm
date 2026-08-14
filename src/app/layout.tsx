import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TEKGUYZ CRM",
  description: "Multi-tenant sales & operations CRM",
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
